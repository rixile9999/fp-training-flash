import { randomUUID } from "node:crypto";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Language, Session } from "@fp/api-contract";
import { describeError } from "./api.ts";
import type { FpApi } from "./api.ts";
import {
  currentItem,
  exerciseStructured,
  renderExercise,
  renderExplanation,
  renderFeedback,
  renderHints,
  renderProgress,
  renderRecommendation,
  renderSessionPlan,
  renderSubmission,
  renderTrialRun,
  uris,
} from "./format.ts";
import { SERVER_INSTRUCTIONS, coachNote, lessonNote, quizNote, recallNote } from "./instructions.ts";
import {
  renderAnswer,
  renderCheckpointResult,
  renderCourse,
  renderLesson,
  renderLessonDone,
  renderPlacementResult,
  renderQuiz,
} from "./lessons.ts";
import { DEFAULT_LOCALE, isLocale, translator } from "./messages.ts";
import { renderRecallCards, renderRecallOverview, renderRecallResult, renderRecallSession, renderRecallSummary } from "./recall.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";

export interface FpMcpServerDeps {
  /** Called lazily for every request, so a host can rotate tokens; tests pass a fake. */
  readonly api: FpApi | (() => FpApi);
  readonly language?: Language;
  /**
   * Fixed output language. When omitted, the account's user.locale is read from /v1/me on first use and cached
   * for the lifetime of this server instance (Korean while it cannot be read).
   */
  readonly locale?: Locale;
  /** Idempotency keys for submissions. */
  readonly newKey?: () => string;
  readonly version?: string;
  /** Milliseconds clock for recall answer times (tests). */
  readonly now?: () => number;
}

type Structured = Record<string, unknown>;

/** Per-call rendering context. */
interface Ctx {
  readonly locale: Locale;
  readonly t: Translate;
  /** Text result; structuredContent always carries `locale` so hosts know the learner's language. */
  readonly text: (text: string, structured?: Structured) => CallToolResult;
}

export function createFpMcpServer(deps: FpMcpServerDeps): McpServer {
  const api = (): FpApi => (typeof deps.api === "function" ? deps.api() : deps.api);
  const language: Language = deps.language ?? "gleam";
  const newKey = deps.newKey ?? randomUUID;
  const now = deps.now ?? Date.now;

  // ---------- learner locale (cached per server instance) ----------
  let cachedLocale: Locale | undefined = deps.locale;
  let pending: Promise<Locale | undefined> | null = null;
  async function learnerLocale(): Promise<Locale> {
    if (cachedLocale) return cachedLocale;
    pending ??= api()
      .me()
      .then((u) => (u.locale && isLocale(u.locale) ? u.locale : undefined))
      .catch(() => undefined);
    const found = await pending;
    if (found) cachedLocale = found;
    else pending = null; // Not cached: retry on the next call (e.g. the API was down or the token was fixed).
    return found ?? DEFAULT_LOCALE;
  }
  async function context(): Promise<Ctx> {
    const locale = await learnerLocale();
    return {
      locale,
      t: translator(locale),
      text: (text, structured) => ({ content: [{ type: "text", text }], structuredContent: { ...structured, locale } }),
    };
  }

  /** Wraps a tool handler: resolves the locale and turns every thrown API error into a localized isError result. */
  function safe<A>(fn: (args: A, ctx: Ctx) => Promise<CallToolResult>): (args: A) => Promise<CallToolResult> {
    return async (args) => {
      const ctx = await context();
      try {
        return await fn(args, ctx);
      } catch (e) {
        return { content: [{ type: "text", text: describeError(e, ctx.locale) }], isError: true };
      }
    };
  }

  const server = new McpServer(
    { name: "fp-training-flash", version: deps.version ?? "0.0.0" },
    { instructions: SERVER_INSTRUCTIONS, capabilities: { tools: {}, resources: {} } },
  );

  /** Renders the session's current item with its full problem content. */
  async function presentCurrent(ctx: Ctx, session: Session, header: MessageId): Promise<CallToolResult> {
    const { t, locale } = ctx;
    const item = currentItem(session);
    if (!item) {
      return ctx.text(`${t(header)}\n\n${renderSessionPlan(session, locale)}\n\n${t("sessionDone")}`, { session, exercise: null });
    }
    const view = await api().exercise(item.exerciseId);
    const text = [
      t(header),
      renderSessionPlan(session, locale),
      t("currentItem", { position: item.index + 1, total: session.items.length, reason: item.reason }),
      renderExercise(view, { locale }),
      coachNote(locale),
    ].join("\n\n");
    return ctx.text(text, { sessionId: session.id, item, exercise: exerciseStructured(view) });
  }

  async function sessionIdFor(exerciseId: string): Promise<string | undefined> {
    try {
      const s = await api().activeSession(language);
      const item = s && currentItem(s);
      return item && item.exerciseId === exerciseId ? s.id : undefined;
    } catch {
      return undefined; // Linking to a session is best effort; the submission itself must not fail.
    }
  }

  // Tool titles, descriptions and argument descriptions are for the host model: English.
  const exerciseId = z.string().min(1).describe("Exercise id, e.g. orders-apply-coupon/base@1");
  const code = z.string().describe("The learner's full Gleam source (contents of src/<module>.gleam). For predict exercises, the answer text.");

  server.registerTool(
    "start_session",
    {
      title: "Start a training session",
      description:
        "Start a short training session (review -> focus -> variation) and return the first exercise with prompt, starter code and public tests.",
      inputSchema: {
        minutes: z.number().int().min(5).max(90).optional().describe("Target minutes, default 15"),
        focus_skill: z.string().min(1).optional().describe("Skill id to focus on (optional)"),
      },
    },
    safe(async ({ minutes, focus_skill }, ctx) => {
      const session = await api().startSession({
        language,
        targetMinutes: minutes ?? 15,
        ...(focus_skill ? { focusSkill: focus_skill } : {}),
      });
      return presentCurrent(ctx, session, "sessionStarted");
    }),
  );

  server.registerTool(
    "current_exercise",
    {
      title: "Current exercise",
      description:
        "Return the active session's current exercise: prompt, starter code, public tests, hint count. Let the learner write the code themselves.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async (_args, ctx) => {
      const session = await api().activeSession(language);
      if (!session) return ctx.text(ctx.t("noSession"), { session: null });
      return presentCurrent(ctx, session, "sessionActive");
    }),
  );

  server.registerTool(
    "get_exercise",
    {
      title: "Get an exercise",
      description: "Return one exercise by id (prompt, starter code, public tests, revealed hints). include_notes adds concept/theory notes (recorded as opened).",
      inputSchema: {
        exercise_id: exerciseId,
        include_notes: z.boolean().optional().describe("Include the full concept/theory notes"),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ exercise_id, include_notes }, ctx) => {
      const view = await api().exercise(exercise_id);
      if (include_notes) await recordNotesOpened(exercise_id, view.conceptNotes, view.theoryTopics);
      const text = [renderExercise(view, { includeNotes: include_notes ?? false, locale: ctx.locale }), coachNote(ctx.locale)].join("\n\n");
      return ctx.text(text, { exercise: exerciseStructured(view) });
    }),
  );

  server.registerTool(
    "run_code",
    {
      title: "Run public tests",
      description: "Run the learner's code against the public tests only. Not recorded, does not affect ratings.",
      inputSchema: { exercise_id: exerciseId, code },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ exercise_id, code }, ctx) => {
      const run = await api().trialRun(exercise_id, { code });
      return ctx.text(renderTrialRun(run, ctx.locale), { trialRun: run });
    }),
  );

  server.registerTool(
    "submit_solution",
    {
      title: "Submit a solution",
      description:
        "Submit the learner's code for grading (public + hidden tests). Returns the evaluation summary and rating change. Links to the active session automatically when the exercise is its current item.",
      inputSchema: {
        exercise_id: exerciseId,
        code,
        session_id: z
          .string()
          .min(1)
          .optional()
          .describe("Session id (optional; linked automatically when the exercise is the active session's current item)"),
      },
    },
    safe(async ({ exercise_id, code, session_id }, ctx) => {
      const sessionId = session_id ?? (await sessionIdFor(exercise_id));
      const view = await api().submit({
        exerciseId: exercise_id,
        code,
        idempotencyKey: newKey(),
        ...(sessionId ? { sessionId } : {}),
      });
      const s = view.submission;
      return ctx.text(renderSubmission(view, ctx.locale), {
        submissionId: s.id,
        attemptNo: s.attemptNo,
        outcome: s.evaluation?.outcome ?? null,
        correctness: s.evaluation?.correctness ?? null,
        tests: s.evaluation?.tests ?? [],
        ratingChange: view.ratingChange,
        sessionId: sessionId ?? null,
      });
    }),
  );

  server.registerTool(
    "get_feedback",
    {
      title: "Coach feedback",
      description: "Structured coach feedback for a submission: summary, evidence, 1-2 priorities, next action.",
      inputSchema: { submission_id: z.string().min(1).describe("Submission id") },
    },
    safe(async ({ submission_id }, ctx) => {
      const fb = await api().feedback(submission_id);
      return ctx.text(renderFeedback(fb, ctx.locale), { feedback: fb });
    }),
  );

  server.registerTool(
    "request_hint",
    {
      title: "Reveal a hint",
      description:
        "Reveal authored hints up to a level (1-5, reveal in order). Levels 1-2 keep the attempt rated; level 3+ makes this exercise's submission unrated.",
      inputSchema: {
        exercise_id: exerciseId,
        level: z.number().int().min(1).max(5).describe("Hint level to reveal up to (1-5)"),
      },
    },
    safe(async ({ exercise_id, level }, ctx) => {
      const { t, locale } = ctx;
      const hints = await api().revealHint(exercise_id, { level });
      const notice = level >= 3 ? `\n\n${t("hintUnratedNotice")}` : "";
      const body = hints.length > 0 ? renderHints(hints, locale) : t("noHintsToReveal");
      return ctx.text(`${t("hintsHeading", { level })}\n\n${body}${notice}`, { hints });
    }),
  );

  server.registerTool(
    "get_explanation",
    {
      title: "Reveal the explanation",
      description:
        "Reveal the reference explanation and solution. WARNING: the exercise becomes unrated and mastery must be shown again on a new exercise. Only call when the learner explicitly asks for it.",
      inputSchema: { exercise_id: exerciseId },
    },
    safe(async ({ exercise_id }, ctx) => {
      const ex = await api().explanation(exercise_id);
      return ctx.text(renderExplanation(ex, ctx.locale), { explanation: ex });
    }),
  );

  server.registerTool(
    "get_progress",
    {
      title: "Learning progress",
      description: "Per-skill ratings, overall rating, due reviews and recurring mistakes.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async (_args, ctx) => {
      const p = await api().progress(language);
      return ctx.text(renderProgress(p, ctx.locale), { profile: p.profile });
    }),
  );

  server.registerTool(
    "recommend_exercise",
    {
      title: "Recommend an exercise",
      description: "Recommend one exercise outside a session (optionally for a skill) and return its problem content.",
      inputSchema: { skill: z.string().min(1).optional().describe("Skill id (optional)") },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ skill }, ctx) => {
      const rec = await api().recommend(language, skill);
      const view = await api().exercise(rec.exerciseId);
      const text = [renderRecommendation(rec, ctx.locale), renderExercise(view, { locale: ctx.locale }), coachNote(ctx.locale)].join("\n\n");
      return ctx.text(text, { recommendation: rec, exercise: exerciseStructured(view) });
    }),
  );

  server.registerTool(
    "skip_item",
    {
      title: "Skip the current exercise",
      description: "Skip the active session's current exercise and return the next one.",
      inputSchema: {},
    },
    safe(async (_args, ctx) => {
      const session = await api().activeSession(language);
      if (!session) return ctx.text(ctx.t("noSession"), { session: null });
      const next = await api().skipItem(session.id);
      return presentCurrent(ctx, next, "itemSkipped");
    }),
  );

  // ---------- Gleam basics course ----------

  const unitId = z.string().min(1).describe("Unit id, e.g. u01-values");
  const lessonId = z.string().min(1).describe("Lesson id within the unit, e.g. l01-values-let");
  const quizId = z.string().min(1).describe("quiz_id returned by the start tool");
  const answers = z
    .record(z.string(), z.number().int().min(0).nullable())
    .describe("itemId -> chosen 0-based choice index, or null when the learner skipped the item");

  server.registerTool(
    "get_course",
    {
      title: "Gleam basics course",
      description:
        "The Gleam basics course: units in order with the learner's progress (lessons done, checkpoint status), placement result and the next step.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async (_args, ctx) => {
      const course = await api().course();
      return ctx.text(renderCourse(course, ctx.locale), { course });
    }),
  );

  server.registerTool(
    "get_lesson",
    {
      title: "Get a lesson",
      description:
        "Return one lesson: short prose parts and multiple-choice exercises (choices labelled with their 0-based index). Contains no answers. Present it step by step.",
      inputSchema: { unit_id: unitId, lesson_id: lessonId },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ unit_id, lesson_id }, ctx) => {
      const view = await api().lesson(unit_id, lesson_id);
      return ctx.text([renderLesson(view, ctx.locale), lessonNote(ctx.locale)].join("\n\n"), { lesson: view });
    }),
  );

  server.registerTool(
    "answer_lesson_exercise",
    {
      title: "Answer a lesson exercise",
      description:
        `Check the learner's choice for one lesson exercise and return feedback. Unrated; retries are free and a wrong answer does not reveal the correct one. choice "show" reveals the answer: only when the learner asks for it.`,
      inputSchema: {
        unit_id: unitId,
        lesson_id: lessonId,
        exercise_id: z.string().min(1).describe("Exercise id from get_lesson, e.g. bind-syntax"),
        choice: z
          .union([z.number().int().min(0), z.literal("show")])
          .describe(`The learner's choice as a 0-based index, or "show" to reveal the answer (only when the learner asks)`),
      },
    },
    safe(async ({ unit_id, lesson_id, exercise_id, choice }, ctx) => {
      const giveUp = choice === "show";
      const res = await api().lessonAnswer(unit_id, lesson_id, {
        exerciseId: exercise_id,
        choice: giveUp ? null : choice,
        ...(giveUp ? { giveUp: true } : {}),
      });
      return ctx.text(renderAnswer(res, giveUp, ctx.locale), { answer: res, gaveUp: giveUp });
    }),
  );

  server.registerTool(
    "complete_lesson",
    {
      title: "Complete a lesson",
      description: "Mark a lesson as done once the learner has worked through it; returns the unit progress and the next step.",
      inputSchema: { unit_id: unitId, lesson_id: lessonId },
    },
    safe(async ({ unit_id, lesson_id }, ctx) => {
      const progress = await api().lessonComplete(unit_id, lesson_id);
      // The next step is a convenience; completing the lesson already succeeded.
      const next = await api()
        .course()
        .then(
          (c) => c.next,
          () => null,
        );
      return ctx.text(renderLessonDone(unit_id, lesson_id, progress, next, ctx.locale), { progress, next });
    }),
  );

  server.registerTool(
    "start_checkpoint",
    {
      title: "Start a unit checkpoint",
      description:
        "Start a rated checkpoint for a unit (6-10 multiple-choice items, pass mark 80%). Returns every item without answers; present them one at a time, then call submit_checkpoint once.",
      inputSchema: { unit_id: unitId },
    },
    safe(async ({ unit_id }, ctx) => {
      const quiz = await api().startCheckpoint(unit_id);
      return ctx.text([renderQuiz(quiz, ctx.locale), quizNote(ctx.locale)].join("\n\n"), { quiz });
    }),
  );

  server.registerTool(
    "submit_checkpoint",
    {
      title: "Submit a unit checkpoint",
      description: "Submit all answers of a checkpoint at once. Returns the score, pass/fail, a per-item review with lesson links and rating changes.",
      inputSchema: { quiz_id: quizId, answers },
    },
    safe(async ({ quiz_id, answers }, ctx) => {
      const res = await api().submitCheckpoint(quiz_id, { answers });
      return ctx.text(renderCheckpointResult(res, ctx.locale), { result: res });
    }),
  );

  server.registerTool(
    "start_placement",
    {
      title: "Start the placement test",
      description:
        "Start the optional placement test (12-15 items, about 5 minutes) for learners who may already know Gleam. Returns every item without answers; present them one at a time, then call submit_placement once.",
      inputSchema: {},
    },
    safe(async (_args, ctx) => {
      const quiz = await api().startPlacement();
      return ctx.text([renderQuiz(quiz, ctx.locale), quizNote(ctx.locale)].join("\n\n"), { quiz });
    }),
  );

  server.registerTool(
    "submit_placement",
    {
      title: "Submit the placement test",
      description: "Submit all placement answers at once. Returns the band, the units marked as passed, a recommendation and a per-item review.",
      inputSchema: { quiz_id: quizId, answers },
    },
    safe(async ({ quiz_id, answers }, ctx) => {
      const res = await api().submitPlacement(quiz_id, { answers });
      return ctx.text(renderPlacementResult(res, ctx.locale), { result: res });
    }),
  );

  // ---------- Recall (memorization) ----------
  // Items never contain answers; the server checks every answer. When the host does not send elapsed_ms, the time
  // since the session started or the previous answer stands in for the learner's answer time.

  const lastRecallEvent = new Map<string, number>();
  const sessionId = z.string().min(1).describe("session_id returned by recall_start");
  const noSpoilers =
    "Never reveal, hint at or fill in the answer (choice, blank, value or function body) before the learner has answered.";

  server.registerTool(
    "recall_overview",
    {
      title: "Recall overview",
      description: "Recall (memorizing Gleam syntax and core gleam_stdlib functions): decks with the learner's progress, cards due now and new cards left today.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async (_args, ctx) => {
      const overview = await api().recallOverview();
      return ctx.text(renderRecallOverview(overview, ctx.locale), { overview });
    }),
  );

  server.registerTool(
    "recall_start",
    {
      title: "Start a recall session",
      description:
        "Start a recall session of about `minutes` (default 10): due reviews, new cards, mixed practice and one or two code-writing items. " +
        "Returns every item without answers. Present exactly one item at a time (for a new card: summary and example first), wait for the learner's own answer, then call recall_answer. " +
        noSpoilers,
      inputSchema: {
        minutes: z.number().int().min(1).max(60).optional().describe("Target length in minutes (default 10)"),
        deck_ids: z.array(z.string().min(1)).min(1).optional().describe("Only these decks, e.g. [\"stdlib\"] (see recall_overview)"),
      },
    },
    safe(async ({ minutes, deck_ids }, ctx) => {
      const view = await api().startRecall({
        ...(minutes === undefined ? {} : { minutes }),
        ...(deck_ids === undefined ? {} : { deckIds: deck_ids }),
      });
      lastRecallEvent.set(view.sessionId, now());
      const text = view.items.length === 0 ? renderRecallSession(view, ctx.locale) : [renderRecallSession(view, ctx.locale), recallNote(ctx.locale)].join("\n\n");
      return ctx.text(text, { session: view });
    }),
  );

  server.registerTool(
    "recall_answer",
    {
      title: "Answer a recall item",
      description:
        "Check the learner's answer to one recall item and return feedback, expected/actual values, diagnostics, missing required functions, the reference (after a wrong code answer) and the next review. " +
        "Send exactly one of: choice (recognize, 0-based index), text (cloze fill or predicted value, as typed), body (produce: only the function body, without the header). " +
        "Only call it with the learner's own answer. " +
        noSpoilers,
      inputSchema: {
        session_id: sessionId,
        item_id: z.string().min(1).describe("item_id of the item from recall_start"),
        choice: z.number().int().min(0).optional().describe("Recognize items: the learner's choice as a 0-based index"),
        text: z.string().optional().describe("Cloze items: the word(s) for the blank; predict items: the value the learner expects"),
        body: z.string().optional().describe("Produce items: the function body the learner wrote, without the header line"),
        elapsed_ms: z.number().min(0).optional().describe("How long the learner took, if known (otherwise measured since the previous recall call)"),
      },
    },
    safe(async ({ session_id, item_id, choice, text, body, elapsed_ms }, ctx) => {
      const given = [choice, text, body].filter((v) => v !== undefined).length;
      if (given !== 1) return { content: [{ type: "text", text: ctx.t("recallOneResponse") }], isError: true };
      const response =
        choice !== undefined
          ? ({ kind: "choice", choice } as const)
          : text !== undefined
            ? ({ kind: "text", text } as const)
            : ({ kind: "code", body: body ?? "" } as const);
      const t = now();
      const elapsedMs = Math.round(elapsed_ms ?? Math.max(0, t - (lastRecallEvent.get(session_id) ?? t)));
      const res = await api().recallAnswer(session_id, { itemId: item_id, response, elapsedMs });
      lastRecallEvent.set(session_id, now());
      return ctx.text(renderRecallResult(res, ctx.locale), { result: res });
    }),
  );

  server.registerTool(
    "recall_finish",
    {
      title: "Finish a recall session",
      description: "Finish a recall session (also when the learner stops early) and return the summary: answered, accuracy, cards learned, due tomorrow, mastery per deck.",
      inputSchema: { session_id: sessionId },
    },
    safe(async ({ session_id }, ctx) => {
      const summary = await api().finishRecall(session_id);
      lastRecallEvent.delete(session_id);
      return ctx.text(renderRecallSummary(summary, ctx.locale), { summary });
    }),
  );

  server.registerTool(
    "recall_cards",
    {
      title: "Browse a recall deck",
      description:
        "List a deck's cards (title, summary) with the learner's stage and next review. Cards contain no answers. Use it for browsing, not as a quiz: do not turn it into questions with answers.",
      inputSchema: { deck_id: z.string().min(1).describe("Deck id, e.g. syntax, stdlib, pitfalls") },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ deck_id }, ctx) => {
      const cards = await api().recallDeckCards(deck_id);
      return ctx.text(renderRecallCards(deck_id, cards, ctx.locale), { deckId: deck_id, cards });
    }),
  );

  // ---------- Resources ----------

  async function recordNotesOpened(
    exId: string,
    concepts: readonly { readonly id: string }[],
    theory: readonly { readonly id: string }[],
  ): Promise<void> {
    const calls = [
      ...concepts.map((n) => api().noteOpened(exId, { kind: "concept", noteId: n.id })),
      ...theory.map((t) => api().noteOpened(exId, { kind: "theory", noteId: t.id })),
    ];
    await Promise.allSettled(calls); // The help ledger is best effort here; reading must not fail.
  }

  const decode = (v: string | string[] | undefined): string => decodeURIComponent(Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

  server.registerResource(
    "exercise-concepts",
    new ResourceTemplate("fp://exercise/{id}/concepts", { list: undefined }),
    { title: "Exercise concept notes", description: "Concept notes linked to an exercise (id percent-encoded).", mimeType: "text/markdown" },
    async (uri, vars): Promise<ReadResourceResult> => {
      const { t } = await context();
      const id = decode(vars.id);
      const view = await api().exercise(id);
      await recordNotesOpened(id, view.conceptNotes, []);
      const text = view.conceptNotes.map((n) => `# ${n.title}\n\n${n.markdown.trim()}`).join("\n\n---\n\n") || t("noConceptNotes");
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  server.registerResource(
    "exercise-theory",
    new ResourceTemplate("fp://exercise/{id}/theory", { list: undefined }),
    { title: "Exercise theory notes", description: "Theory topics linked to an exercise (id percent-encoded).", mimeType: "text/markdown" },
    async (uri, vars): Promise<ReadResourceResult> => {
      const { t } = await context();
      const id = decode(vars.id);
      const view = await api().exercise(id);
      await recordNotesOpened(id, [], view.theoryTopics);
      const text = view.theoryTopics.map((x) => `# ${x.title}\n\n${x.markdown.trim()}`).join("\n\n---\n\n") || t("noTheoryNotes");
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  server.registerResource(
    "theory",
    new ResourceTemplate("fp://theory/{id}", {
      list: async () => {
        try {
          const topics = await api().theoryTopics();
          return { resources: topics.map((x) => ({ uri: uris.theory(x.id), name: x.title, mimeType: "text/markdown" })) };
        } catch {
          return { resources: [] };
        }
      },
    }),
    { title: "Theory note", description: "A theory topic by id.", mimeType: "text/markdown" },
    async (uri, vars): Promise<ReadResourceResult> => {
      const { t } = await context();
      const id = decode(vars.id);
      const topic = (await api().theoryTopics()).find((x) => x.id === id);
      if (!topic) throw new Error(t("theoryNotFound", { id }));
      const reading = topic.furtherReading.map((c) => `- ${c.text}${c.url ? ` <${c.url}>` : ""}`).join("\n");
      const text = `# ${topic.title}\n\n${topic.markdown.trim()}${reading ? `\n\n${t("furtherReading")}\n${reading}` : ""}`;
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  return server;
}
