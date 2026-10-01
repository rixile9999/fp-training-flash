import type { AnswerResult, CheckpointResult, CourseView, LessonView, PlacementResult, Quiz, UnitProgress } from "@fp/api-contract";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";

// Text rendering of the Gleam basics course: course overview, lessons, lesson answers, checkpoint and placement
// quizzes. Lesson content (titles, prose, prompts, choices, feedback) arrives from the server in the account
// locale and is printed as is; only the chrome comes from the catalog.

// Types api-contract does not re-export are derived structurally.
export type NextStep = CourseView["next"];
export type LessonBlock = LessonView["lesson"]["blocks"][number];
export type ExerciseBlock = Extract<LessonBlock, { readonly kind: "exercise" }>;
export type QuizItem = Quiz["items"][number];
export type QuizItemReview = CheckpointResult["review"][number];
export type PlacementBand = PlacementResult["band"];

const EXERCISE_TYPE: Record<ExerciseBlock["type"], MessageId> = { choice: "lessonTypeChoice", predict: "lessonTypePredict" };
const BAND: Record<PlacementBand, MessageId> = {
  beginner: "bandBeginner",
  intermediate: "bandIntermediate",
  advanced: "bandAdvanced",
};

const RULE = "─".repeat(40);

/** "u01-values/l01-values-let". */
export function lessonRef(unitId: string, lessonId: string): string {
  return `${unitId}/${lessonId}`;
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function indent(s: string, pad = "    "): string {
  return s
    .replace(/\n+$/, "")
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

/** Inline Markdown -> plain text: code spans lose their backticks, emphasis markers and link syntax disappear. */
export function plainInline(text: string): string {
  return text
    .split(/(`+[^`]*?`+)/)
    .map((part, i) => {
      if (i % 2 === 1) return part.replace(/^`+\s?|\s?`+$/g, "");
      return part
        .replace(/!?\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, label: string, url: string) => (label ? `${label} (${url})` : url))
        .replace(/(\*\*|__)(?=\S)([^\n]*?\S)\1/g, "$2")
        .replace(/(^|[^\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/g, "$1$2")
        .replace(/(^|[^\w_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_])/g, "$1$2")
        .replace(/~~(?=\S)([^\n]*?\S)~~/g, "$1");
    })
    .join("");
}

/** Block Markdown -> plain terminal text. Fenced code is indented and kept verbatim. */
export function plainText(markdown: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of markdown.replace(/\r\n/g, "\n").trim().split("\n")) {
    const marker = /^\s*(```+|~~~+)/.exec(line)?.[1];
    if (fence !== null) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      else out.push(line ? `    ${line}` : "");
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      out.push(plainInline(heading[1] ?? ""));
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push(RULE);
      continue;
    }
    out.push(plainInline(line.replace(/^(\s*)[*+]\s+/, "$1- ")));
  }
  return out.join("\n");
}

// ---------- course ----------

/** One line telling the learner what to run next. */
export function nextStepLine(next: NextStep, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  switch (next.kind) {
    case "lesson":
      return t("nextLesson", { ref: lessonRef(next.unitId, next.lessonId) });
    case "checkpoint":
      return t("nextCheckpoint", { unit: next.unitId });
    case "done":
      return t("courseDone");
  }
}

function checkpointStatus(t: Translate, p: UnitProgress): string {
  if (p.passedByPlacement) return t("checkpointPassedByPlacement");
  if (p.checkpointPassed) return t("checkpointPassed");
  if (p.checkpointBest !== undefined) return t("checkpointBest", { score: pct(p.checkpointBest) });
  return t("checkpointNotTaken");
}

export function formatCourse(course: CourseView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const nextUnit = course.next.kind === "done" ? undefined : course.next.unitId;
  const out = [t("courseHeading")];
  for (const u of [...course.units].sort((a, b) => a.order - b.order)) {
    const p = u.progress;
    const done = new Set(p.lessonsCompleted);
    const completed = u.lessonIds.filter((id) => done.has(id)).length;
    const mark = p.checkpointPassed || p.passedByPlacement ? "✓" : u.id === nextUnit ? "▶" : " ";
    const parts = [
      t("unitLessons", { done: completed, total: u.lessonIds.length }),
      checkpointStatus(t, p),
      ...(p.unlocked ? [] : [t("unitLocked")]),
    ];
    out.push(`${mark} ${u.order}. ${u.title} (${u.id}) · L${u.level} · ${parts.join(" · ")}`);
    if (u.id === nextUnit) {
      u.lessonIds.forEach((id, i) => {
        const current = course.next.kind === "lesson" && course.next.lessonId === id;
        out.push(`     ${done.has(id) ? "✓" : current ? "▶" : "·"} ${u.lessonTitles[i] ?? id} (${lessonRef(u.id, id)})`);
      });
    }
  }
  out.push("");
  if (course.placement) {
    const pl = course.placement;
    out.push(t("placementSummary", { score: pl.score, total: pl.total, band: t(BAND[pl.band]) }));
  } else {
    out.push(t("placementSuggest"));
  }
  out.push(nextStepLine(course.next, locale));
  return out.join("\n");
}

// ---------- lesson ----------

function choiceLines(choices: readonly string[]): string {
  return choices.map((c, i) => `  ${i + 1}) ${plainInline(c)}`).join("\n");
}

export function exerciseBlocks(lesson: LessonView["lesson"]): ExerciseBlock[] {
  return lesson.blocks.filter((b): b is ExerciseBlock => b.kind === "exercise");
}

export function formatLesson(view: LessonView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const { lesson } = view;
  const ref = lessonRef(lesson.unitId, lesson.id);
  const solved = new Set(view.solved);
  const exercises = exerciseBlocks(lesson);
  const out = [`${lesson.title} (${ref})${view.completed ? ` · ${t("lessonCompleted")}` : ""}`, RULE];
  let n = 0;
  for (const block of lesson.blocks) {
    if (block.kind === "prose") {
      out.push(plainText(block.markdown), "");
      continue;
    }
    n += 1;
    const status = solved.has(block.id) ? ` · ✓ ${t("exerciseSolved")}` : "";
    const lines = [`${t("exerciseLabel", { n })} ${block.id} · ${t(EXERCISE_TYPE[block.type])}${status}`, plainText(block.prompt)];
    if (block.code) lines.push("", indent(block.code));
    lines.push("", choiceLines(block.choices));
    out.push(lines.join("\n"), "");
  }
  out.push(RULE);
  if (exercises.length > 0) {
    out.push(t("lessonSolvedCount", { solved: exercises.filter((e) => solved.has(e.id)).length, total: exercises.length }));
    out.push(t("lessonAnswerHow", { ref }));
  }
  out.push(view.completed ? t("lessonNextHow") : t("lessonDoneHow", { ref }));
  return out.join("\n");
}

export function formatAnswer(res: AnswerResult, gaveUp: boolean, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const head = gaveUp ? t("answerRevealed") : res.correct ? `✓ ${t("answerCorrect")}` : `✗ ${t("answerWrong")}`;
  const out = [head];
  if (res.correctIndex !== undefined && (gaveUp || !res.correct)) out.push(t("answerCorrectChoice", { n: res.correctIndex + 1 }));
  if (res.feedback.trim()) out.push(plainText(res.feedback));
  if (!res.correct && !gaveUp) out.push(t("answerRetry"));
  return out.join("\n");
}

export function formatLessonDone(ref: string, p: UnitProgress, next: NextStep | null, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [t("lessonMarkedDone", { ref, count: p.lessonsCompleted.length })];
  out.push(next ? nextStepLine(next, locale) : t("lessonNextHow"));
  return out.join("\n");
}

// ---------- checkpoint and placement ----------

export function formatQuizHeader(quiz: Quiz, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  if (quiz.kind === "placement") return t("placementHeader", { count: quiz.items.length });
  return t("checkpointHeader", {
    unit: quiz.unitId ?? "",
    count: quiz.items.length,
    threshold: pct(quiz.passThreshold ?? 0.8),
  });
}

/** One quiz item for display (1-based choice numbers). Never contains an answer: quiz items have none. */
export function formatQuizItem(item: QuizItem, position: number, total: number, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const lines = [t("quizItemHeading", { position, total }), plainText(item.prompt)];
  if (item.code) lines.push("", indent(item.code));
  lines.push("", choiceLines(item.choices));
  return lines.join("\n");
}

/** The whole quiz for non-interactive use, with how to submit answers. */
export function formatQuiz(quiz: Quiz, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [formatQuizHeader(quiz, locale), t("quizIdLine", { id: quiz.quizId }), ""];
  quiz.items.forEach((item, i) => out.push(`${formatQuizItem(item, i + 1, quiz.items.length, locale)}\n  id: ${item.itemId}`, ""));
  const command = quiz.kind === "placement" ? "fp placement" : `fp checkpoint ${quiz.unitId ?? "<unit>"}`;
  const example = quiz.items
    .slice(0, 2)
    .map((item) => `${item.itemId}=0`)
    .join(",");
  out.push(t("quizAnswersHow", { command, id: quiz.quizId, example: example || "<itemId>=0" }));
  return out.join("\n");
}

function reviewLines(t: Translate, review: readonly QuizItemReview[], quiz: Quiz | undefined): string[] {
  const position = new Map(quiz?.items.map((item, i) => [item.itemId, i + 1]) ?? []);
  return review.map((r, i) => {
    const label = position.has(r.itemId) ? t("quizItemShort", { position: position.get(r.itemId) ?? i + 1 }) : r.itemId;
    const chosen = r.chosen === null ? t("quizSkipped") : String(r.chosen + 1);
    const lines = [`${r.correct ? "✓" : "✗"} ${label} · ${t("quizChosen", { chosen, correct: r.correctIndex + 1 })}`];
    if (!r.correct && r.feedback.trim()) lines.push(indent(plainText(r.feedback)));
    if (!r.correct && r.backlink) {
      const [ref = r.backlink, exercise] = r.backlink.split("#");
      lines.push(`    ${t("quizRevisit", { ref, exercise: exercise ?? "" })}`);
    }
    return lines.join("\n");
  });
}

function ratingLine(rc: CheckpointResult["ratingChanges"][number]): string {
  const delta = Math.round(rc.after - rc.before);
  return `${rc.skillId} ${Math.round(rc.before)} → ${Math.round(rc.after)} (${delta > 0 ? "+" : ""}${delta})`;
}

export function formatCheckpointResult(res: CheckpointResult, quiz?: Quiz, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [
    t("checkpointResult", { unit: res.unitId, score: res.score, total: res.total }),
    res.passed ? t("checkpointPassedMessage") : t("checkpointFailedMessage", { unit: res.unitId }),
    "",
    ...reviewLines(t, res.review, quiz),
  ];
  if (res.ratingChanges.length > 0) out.push("", t("ratingChangesHeading"), ...res.ratingChanges.map((rc) => `  ${ratingLine(rc)}`));
  return out.join("\n");
}

export function formatPlacementResult(res: PlacementResult, quiz?: Quiz, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [t("placementResult", { score: res.score, total: res.total, band: t(BAND[res.band]) })];
  out.push(res.unitsPassed.length > 0 ? t("placementUnitsPassed", { units: res.unitsPassed.join(", ") }) : t("placementNoUnitsPassed"));
  out.push(res.recommendation === "training" ? t("placementGoTraining") : t("placementGoCourse"));
  out.push("", ...reviewLines(t, res.review, quiz));
  return out.join("\n");
}
