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
import { COACH_NOTE, SERVER_INSTRUCTIONS } from "./instructions.ts";

export interface FpMcpServerDeps {
  /** Called lazily for every request, so a host can rotate tokens; tests pass a fake. */
  readonly api: FpApi | (() => FpApi);
  readonly language?: Language;
  /** Idempotency keys for submissions. */
  readonly newKey?: () => string;
  readonly version?: string;
}

type Structured = Record<string, unknown>;

function textResult(text: string, structured?: Structured): CallToolResult {
  const r: CallToolResult = { content: [{ type: "text", text }] };
  if (structured !== undefined) r.structuredContent = structured;
  return r;
}

function errorResult(e: unknown): CallToolResult {
  return { content: [{ type: "text", text: describeError(e) }], isError: true };
}

/** Wraps a tool handler so every thrown API error becomes a Korean isError result. */
function safe<A>(fn: (args: A) => Promise<CallToolResult>): (args: A) => Promise<CallToolResult> {
  return async (args) => {
    try {
      return await fn(args);
    } catch (e) {
      return errorResult(e);
    }
  };
}

const NO_SESSION = "진행 중인 세션이 없습니다. start_session으로 새 세션을 시작하거나 recommend_exercise로 문제를 추천받으세요.";

export function createFpMcpServer(deps: FpMcpServerDeps): McpServer {
  const api = (): FpApi => (typeof deps.api === "function" ? deps.api() : deps.api);
  const language: Language = deps.language ?? "gleam";
  const newKey = deps.newKey ?? randomUUID;

  const server = new McpServer(
    { name: "fp-training-flash", version: deps.version ?? "0.0.0" },
    { instructions: SERVER_INSTRUCTIONS, capabilities: { tools: {}, resources: {} } },
  );

  /** Renders the session's current item with its full problem content. */
  async function presentCurrent(session: Session, header: string): Promise<CallToolResult> {
    const item = currentItem(session);
    if (!item) {
      return textResult(
        `${header}\n\n${renderSessionPlan(session)}\n\n이 세션의 모든 문제를 마쳤습니다. get_progress로 결과를 확인하거나 start_session으로 새 세션을 시작하세요.`,
        { session, exercise: null },
      );
    }
    const view = await api().exercise(item.exerciseId);
    const text = [
      header,
      renderSessionPlan(session),
      `현재 문제 (${item.index + 1}/${session.items.length}) · ${item.reason}`,
      renderExercise(view),
      COACH_NOTE,
    ].join("\n\n");
    return textResult(text, { sessionId: session.id, item, exercise: exerciseStructured(view) });
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

  const exerciseId = z.string().min(1).describe("문제 ID, 예: orders-apply-coupon/base@1");
  const code = z.string().describe("학습자가 작성한 Gleam 소스 전체 (src/<module>.gleam 내용). predict 문제는 답 텍스트.");

  server.registerTool(
    "start_session",
    {
      title: "훈련 세션 시작",
      description:
        "Start a short training session (review -> focus -> variation) and return the first exercise with prompt, starter code and public tests.",
      inputSchema: {
        minutes: z.number().int().min(5).max(90).optional().describe("목표 시간(분), 기본 15"),
        focus_skill: z.string().min(1).optional().describe("집중할 기술 ID (선택)"),
      },
    },
    safe(async ({ minutes, focus_skill }) => {
      const session = await api().startSession({
        language,
        targetMinutes: minutes ?? 15,
        ...(focus_skill ? { focusSkill: focus_skill } : {}),
      });
      return presentCurrent(session, "새 세션을 시작했습니다.");
    }),
  );

  server.registerTool(
    "current_exercise",
    {
      title: "현재 문제",
      description:
        "Return the active session's current exercise: prompt, starter code, public tests, hint count. Let the learner write the code themselves.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => {
      const session = await api().activeSession(language);
      if (!session) return textResult(NO_SESSION, { session: null });
      return presentCurrent(session, "진행 중인 세션입니다.");
    }),
  );

  server.registerTool(
    "get_exercise",
    {
      title: "문제 보기",
      description: "Return one exercise by id (prompt, starter code, public tests, revealed hints). include_notes adds concept/theory notes (recorded as opened).",
      inputSchema: {
        exercise_id: exerciseId,
        include_notes: z.boolean().optional().describe("개념/이론 노트 전문 포함 여부"),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ exercise_id, include_notes }) => {
      const view = await api().exercise(exercise_id);
      if (include_notes) await recordNotesOpened(exercise_id, view.conceptNotes, view.theoryTopics);
      const text = [renderExercise(view, { includeNotes: include_notes ?? false }), COACH_NOTE].join("\n\n");
      return textResult(text, { exercise: exerciseStructured(view) });
    }),
  );

  server.registerTool(
    "run_code",
    {
      title: "공개 테스트 실행",
      description: "Run the learner's code against the public tests only. Not recorded, does not affect ratings.",
      inputSchema: { exercise_id: exerciseId, code },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ exercise_id, code }) => {
      const run = await api().trialRun(exercise_id, { code });
      return textResult(renderTrialRun(run), { trialRun: run });
    }),
  );

  server.registerTool(
    "submit_solution",
    {
      title: "제출",
      description:
        "Submit the learner's code for grading (public + hidden tests). Returns the evaluation summary and rating change. Links to the active session automatically when the exercise is its current item.",
      inputSchema: {
        exercise_id: exerciseId,
        code,
        session_id: z.string().min(1).optional().describe("세션 ID (생략하면 진행 중인 세션의 현재 문제일 때 자동 연결)"),
      },
    },
    safe(async ({ exercise_id, code, session_id }) => {
      const sessionId = session_id ?? (await sessionIdFor(exercise_id));
      const view = await api().submit({
        exerciseId: exercise_id,
        code,
        idempotencyKey: newKey(),
        ...(sessionId ? { sessionId } : {}),
      });
      const s = view.submission;
      return textResult(renderSubmission(view), {
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
      title: "코치 피드백",
      description: "Structured coach feedback for a submission: summary, evidence, 1-2 priorities, next action.",
      inputSchema: { submission_id: z.string().min(1).describe("제출 ID") },
    },
    safe(async ({ submission_id }) => {
      const fb = await api().feedback(submission_id);
      return textResult(renderFeedback(fb), { feedback: fb });
    }),
  );

  server.registerTool(
    "request_hint",
    {
      title: "힌트",
      description:
        "Reveal authored hints up to a level (1-5, reveal in order). Levels 1-2 keep the attempt rated; level 3+ makes this exercise's submission unrated.",
      inputSchema: {
        exercise_id: exerciseId,
        level: z.number().int().min(1).max(5).describe("공개할 힌트 단계 (1-5)"),
      },
    },
    safe(async ({ exercise_id, level }) => {
      const hints = await api().revealHint(exercise_id, { level });
      const notice = level >= 3 ? "\n\n참고: 힌트 3단계 이상을 사용했으므로 이 문제의 제출은 레이팅에 반영되지 않습니다." : "";
      const body = hints.length > 0 ? renderHints(hints) : "공개할 힌트가 없습니다.";
      return textResult(`## 힌트 (${level}단계까지)\n\n${body}${notice}`, { hints });
    }),
  );

  server.registerTool(
    "get_explanation",
    {
      title: "해설 공개",
      description:
        "Reveal the reference explanation and solution. WARNING: the exercise becomes unrated and mastery must be shown again on a new exercise. Only call when the learner explicitly asks for it.",
      inputSchema: { exercise_id: exerciseId },
    },
    safe(async ({ exercise_id }) => {
      const ex = await api().explanation(exercise_id);
      return textResult(renderExplanation(ex), { explanation: ex });
    }),
  );

  server.registerTool(
    "get_progress",
    {
      title: "학습 현황",
      description: "Per-skill ratings, overall rating, due reviews and recurring mistakes.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => {
      const p = await api().progress(language);
      return textResult(renderProgress(p), { profile: p.profile });
    }),
  );

  server.registerTool(
    "recommend_exercise",
    {
      title: "문제 추천",
      description: "Recommend one exercise outside a session (optionally for a skill) and return its problem content.",
      inputSchema: { skill: z.string().min(1).optional().describe("기술 ID (선택)") },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ skill }) => {
      const rec = await api().recommend(language, skill);
      const view = await api().exercise(rec.exerciseId);
      const text = [renderRecommendation(rec), renderExercise(view), COACH_NOTE].join("\n\n");
      return textResult(text, { recommendation: rec, exercise: exerciseStructured(view) });
    }),
  );

  server.registerTool(
    "skip_item",
    {
      title: "문제 건너뛰기",
      description: "Skip the active session's current exercise and return the next one.",
      inputSchema: {},
    },
    safe(async () => {
      const session = await api().activeSession(language);
      if (!session) return textResult(NO_SESSION, { session: null });
      const next = await api().skipItem(session.id);
      return presentCurrent(next, "현재 문제를 건너뛰었습니다.");
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
    { title: "문제의 개념 노트", description: "Concept notes linked to an exercise (id percent-encoded).", mimeType: "text/markdown" },
    async (uri, vars): Promise<ReadResourceResult> => {
      const id = decode(vars.id);
      const view = await api().exercise(id);
      await recordNotesOpened(id, view.conceptNotes, []);
      const text =
        view.conceptNotes.map((n) => `# ${n.title}\n\n${n.markdown.trim()}`).join("\n\n---\n\n") || "이 문제에 연결된 개념 노트가 없습니다.";
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  server.registerResource(
    "exercise-theory",
    new ResourceTemplate("fp://exercise/{id}/theory", { list: undefined }),
    { title: "문제의 이론 노트", description: "Theory topics linked to an exercise (id percent-encoded).", mimeType: "text/markdown" },
    async (uri, vars): Promise<ReadResourceResult> => {
      const id = decode(vars.id);
      const view = await api().exercise(id);
      await recordNotesOpened(id, [], view.theoryTopics);
      const text =
        view.theoryTopics.map((t) => `# ${t.title}\n\n${t.markdown.trim()}`).join("\n\n---\n\n") || "이 문제에 연결된 이론 노트가 없습니다.";
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  server.registerResource(
    "theory",
    new ResourceTemplate("fp://theory/{id}", {
      list: async () => {
        try {
          const topics = await api().theoryTopics();
          return { resources: topics.map((t) => ({ uri: uris.theory(t.id), name: t.title, mimeType: "text/markdown" })) };
        } catch {
          return { resources: [] };
        }
      },
    }),
    { title: "이론 노트", description: "A theory topic by id.", mimeType: "text/markdown" },
    async (uri, vars): Promise<ReadResourceResult> => {
      const id = decode(vars.id);
      const topic = (await api().theoryTopics()).find((t) => t.id === id);
      if (!topic) throw new Error(`이론 노트를 찾을 수 없습니다: ${id}`);
      const reading = topic.furtherReading.map((c) => `- ${c.text}${c.url ? ` <${c.url}>` : ""}`).join("\n");
      const text = `# ${topic.title}\n\n${topic.markdown.trim()}${reading ? `\n\n## 더 읽을거리\n${reading}` : ""}`;
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );

  return server;
}
