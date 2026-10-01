import type { AnswerResult, CheckpointResult, CourseView, LessonView, PlacementResult, Quiz, UnitProgress } from "@fp/api-contract";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";

// Markdown rendering of the Gleam basics course for MCP hosts. Lesson content (titles, prose, prompts, choices,
// feedback) arrives in the learner's locale and is passed through; only the chrome comes from the catalog.
// Choices are labelled with their 0-based index ([0], [1], ...) because answer_lesson_exercise and the quiz
// submit tools take that index.

// Types api-contract does not re-export are derived structurally.
type NextStep = CourseView["next"];
type ExerciseBlock = Extract<LessonView["lesson"]["blocks"][number], { readonly kind: "exercise" }>;
type QuizItem = Quiz["items"][number];
type QuizItemReview = CheckpointResult["review"][number];

const EXERCISE_TYPE: Record<ExerciseBlock["type"], MessageId> = { choice: "lessonTypeChoice", predict: "lessonTypePredict" };
const BAND: Record<PlacementResult["band"], MessageId> = {
  beginner: "bandBeginner",
  intermediate: "bandIntermediate",
  advanced: "bandAdvanced",
};

function fence(code: string): string {
  return "```gleam\n" + code.replace(/\n+$/, "") + "\n```";
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function choices(list: readonly string[]): string {
  return list.map((c, i) => `- [${i}] ${c}`).join("\n");
}

/** The tool call that continues the course. */
export function renderNextStep(next: NextStep, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  switch (next.kind) {
    case "lesson":
      return t("nextLesson", { unit: next.unitId, lesson: next.lessonId });
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

export function renderCourse(course: CourseView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const nextUnit = course.next.kind === "done" ? undefined : course.next.unitId;
  const lines: string[] = [];
  for (const u of [...course.units].sort((a, b) => a.order - b.order)) {
    const p = u.progress;
    const done = new Set(p.lessonsCompleted);
    const mark = p.checkpointPassed || p.passedByPlacement ? "✓" : u.id === nextUnit ? "▶" : "·";
    const parts = [
      t("unitLessons", { done: u.lessonIds.filter((id) => done.has(id)).length, total: u.lessonIds.length }),
      checkpointStatus(t, p),
      ...(p.unlocked ? [] : [t("unitLocked")]),
    ];
    lines.push(`- ${mark} **${u.order}. ${u.title}** (\`${u.id}\`, L${u.level}) · ${parts.join(" · ")}`);
    if (u.id === nextUnit) {
      u.lessonIds.forEach((id, i) => {
        const current = course.next.kind === "lesson" && course.next.lessonId === id;
        lines.push(`  - ${done.has(id) ? "✓" : current ? "▶" : "·"} ${u.lessonTitles[i] ?? id} (\`${id}\`)`);
      });
    }
  }
  const placement = course.placement
    ? t("placementSummary", { score: course.placement.score, total: course.placement.total, band: t(BAND[course.placement.band]) })
    : t("placementSuggest");
  return [t("courseHeading"), lines.join("\n"), placement, renderNextStep(course.next, locale)].join("\n\n");
}

export function renderLesson(view: LessonView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const { lesson } = view;
  const solved = new Set(view.solved);
  const out = [
    `## ${lesson.title}`,
    t("lessonMeta", { unit: lesson.unitId, lesson: lesson.id }) + (view.completed ? ` · ${t("lessonCompleted")}` : ""),
  ];
  let n = 0;
  for (const block of lesson.blocks) {
    if (block.kind === "prose") {
      out.push(block.markdown.trim());
      continue;
    }
    n += 1;
    const status = solved.has(block.id) ? ` · ✓ ${t("exerciseSolved")}` : "";
    const parts = [`### ${t("exerciseLabel", { n, id: block.id, type: t(EXERCISE_TYPE[block.type]) })}${status}`, block.prompt.trim()];
    if (block.code) parts.push(fence(block.code));
    parts.push(choices(block.choices));
    out.push(parts.join("\n\n"));
  }
  return out.join("\n\n");
}

export function renderAnswer(res: AnswerResult, gaveUp: boolean, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [gaveUp ? t("answerRevealed") : res.correct ? t("answerCorrect") : t("answerWrong")];
  if (gaveUp && res.correctIndex !== undefined) out.push(t("answerCorrectChoice", { index: res.correctIndex }));
  if (res.feedback.trim()) out.push(res.feedback.trim());
  if (!res.correct && !gaveUp) out.push(t("answerRetry"));
  return out.join("\n\n");
}

export function renderLessonDone(unitId: string, lessonId: string, p: UnitProgress, next: NextStep | null, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [t("lessonMarkedDone", { unit: unitId, lesson: lessonId, count: p.lessonsCompleted.length })];
  if (next) out.push(renderNextStep(next, locale));
  return out.join("\n\n");
}

function renderQuizItem(t: Translate, item: QuizItem, position: number, total: number): string {
  const parts = [`### ${t("quizItemHeading", { position, total, id: item.itemId })}`, item.prompt.trim()];
  if (item.code) parts.push(fence(item.code));
  parts.push(choices(item.choices));
  return parts.join("\n\n");
}

/** All items (the host presents them one at a time). Quiz items never contain answers. */
export function renderQuiz(quiz: Quiz, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const header =
    quiz.kind === "placement"
      ? t("placementHeader", { count: quiz.items.length })
      : t("checkpointHeader", { unit: quiz.unitId ?? "", count: quiz.items.length, threshold: pct(quiz.passThreshold ?? 0.8) });
  const submit = quiz.kind === "placement" ? "submit_placement" : "submit_checkpoint";
  return [
    `## ${header}`,
    t("quizIdLine", { id: quiz.quizId }),
    ...quiz.items.map((item, i) => renderQuizItem(t, item, i + 1, quiz.items.length)),
    t("quizSubmitHow", { tool: submit, id: quiz.quizId }),
  ].join("\n\n");
}

function renderReview(t: Translate, review: readonly QuizItemReview[]): string {
  return review
    .map((r) => {
      const chosen = r.chosen === null ? t("quizSkipped") : `[${r.chosen}]`;
      const lines = [`- ${r.correct ? "✓" : "✗"} \`${r.itemId}\` · ${t("quizChosen", { chosen, correct: `[${r.correctIndex}]` })}`];
      if (!r.correct && r.feedback.trim()) lines.push(`  ${r.feedback.trim().replace(/\n/g, "\n  ")}`);
      if (!r.correct && r.backlink) {
        const [ref = r.backlink, exercise = ""] = r.backlink.split("#");
        const slash = ref.indexOf("/");
        lines.push(`  ${t("quizRevisit", { unit: ref.slice(0, slash), lesson: ref.slice(slash + 1), exercise })}`);
      }
      return lines.join("\n");
    })
    .join("\n");
}

export function renderCheckpointResult(res: CheckpointResult, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [
    `## ${t("checkpointResult", { unit: res.unitId, score: res.score, total: res.total })}`,
    res.passed ? t("checkpointPassedMessage") : t("checkpointFailedMessage", { unit: res.unitId }),
    renderReview(t, res.review),
  ];
  if (res.ratingChanges.length > 0) {
    const rows = res.ratingChanges.map((rc) => {
      const delta = Math.round(rc.after - rc.before);
      return `- ${rc.skillId}: ${Math.round(rc.before)} → ${Math.round(rc.after)} (${delta > 0 ? "+" : ""}${delta})`;
    });
    out.push(`${t("ratingChangesHeading")}\n${rows.join("\n")}`);
  }
  return out.join("\n\n");
}

export function renderPlacementResult(res: PlacementResult, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  return [
    `## ${t("placementResult", { score: res.score, total: res.total, band: t(BAND[res.band]) })}`,
    res.unitsPassed.length > 0 ? t("placementUnitsPassed", { units: res.unitsPassed.join(", ") }) : t("placementNoUnitsPassed"),
    res.recommendation === "training" ? t("placementGoTraining") : t("placementGoCourse"),
    renderReview(t, res.review),
  ].join("\n\n");
}
