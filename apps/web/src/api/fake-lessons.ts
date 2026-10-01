/** Fake course routes over generated/fake-lessons.ts. Answers are checked here, never in the UI; quizzes are rated via `rate`. */
import { ApiError } from "@fp/api-contract";
import type { ApiClient, CheckpointResult, CourseView, Locale, PlacementResult, Quiz, RatingChange, UnitProgress } from "@fp/api-contract";
import { pickLocale } from "../i18n/locale.ts";
import type { LocalizedText } from "../i18n/locale.ts";
import { FAKE_LESSONS, FAKE_UNITS } from "./generated/fake-lessons.ts";
import type { FakeExercise, FakeLesson, FakeLessonUnit } from "./generated/fake-lessons.ts";
import type { NextStep, QuizItemReview } from "./types.ts";

type ItemRef = { readonly unitId: string; readonly lessonId: string; readonly ex: FakeExercise };
type Answers = Readonly<Record<string, number | null>>;
type CourseApi = Pick<ApiClient, "course" | "lesson" | "lessonAnswer" | "lessonComplete" | "startCheckpoint" | "submitCheckpoint" | "startPlacement" | "submitPlacement">;

export interface FakeCourseDeps {
  readonly wait: <T>(value: () => T) => Promise<T>;
  readonly locale: () => Locale;
  readonly iso: () => string;
  readonly nextId: (prefix: string) => string;
  readonly rate: (skillId: string, outcomes: readonly boolean[], difficulty: number) => RatingChange;
}

const LEVEL_DIFFICULTY = [1000, 900, 1000, 1100, 1200];
const notFound = (message: string) => new ApiError(404, { code: "not_found", message });

const spread = <T>(xs: readonly T[], max: number): T[] => (xs.length <= max ? [...xs] : Array.from({ length: max }, (_, i) => xs[Math.floor((i * xs.length) / max)]!));

export function createFakeCourse(deps: FakeCourseDeps): CourseApi {
  const { wait } = deps;
  const L = (t: LocalizedText) => pickLocale(t, deps.locale());
  const completed = new Set(["u01-values/l01-values-let"]);
  const solved = new Set(["u01-values/l01-values-let#bind-syntax", "u01-values/l01-values-let#let-use"]);
  const checkpoints = new Map<string, { passed: boolean; best: number }>();
  let placement: PlacementResult | null = null;
  const quizzes = new Map<string, { kind: Quiz["kind"]; unit?: FakeLessonUnit; items: Map<string, ItemRef> }>();
  const results = new Map<string, CheckpointResult | PlacementResult>();

  const unitOf = (id: string) => FAKE_UNITS.find((u) => u.id === id);
  const lessonOf = (unitId: string, lessonId: string) => {
    const l = FAKE_LESSONS.find((x) => x.unitId === unitId && x.id === lessonId);
    if (!l) throw notFound("가짜 API 샘플에는 u01, u02 레슨만 있습니다.");
    return l;
  };
  const exercises = (l: FakeLesson) => l.blocks.filter((b): b is FakeExercise => b.kind === "exercise");
  const refsOf = (unitId: string): ItemRef[] => FAKE_LESSONS.filter((l) => l.unitId === unitId).flatMap((l) => exercises(l).map((ex) => ({ unitId, lessonId: l.id, ex })));
  const passed = (unitId: string) => !!checkpoints.get(unitId)?.passed || !!placement?.unitsPassed.includes(unitId);
  const done = (u: FakeLessonUnit) => u.lessonIds.filter((l) => completed.has(`${u.id}/${l}`));

  const progress = (u: FakeLessonUnit): UnitProgress => {
    const cp = checkpoints.get(u.id);
    return {
      unitId: u.id,
      lessonsCompleted: done(u),
      checkpointPassed: passed(u.id),
      ...(cp ? { checkpointBest: cp.best } : {}),
      unlocked: u.prerequisites.every(passed),
      passedByPlacement: !cp?.passed && passed(u.id),
    };
  };

  const next = (): NextStep => {
    const u = FAKE_UNITS.find((x) => !passed(x.id));
    if (!u) return { kind: "done" };
    const lessonId = u.lessonIds.find((l) => !completed.has(`${u.id}/${l}`));
    return lessonId ? { kind: "lesson", unitId: u.id, lessonId } : { kind: "checkpoint", unitId: u.id };
  };

  const newQuiz = (kind: Quiz["kind"], refs: readonly ItemRef[], unit?: FakeLessonUnit): Quiz => {
    const quizId = deps.nextId(kind);
    const items = new Map(refs.map((r, i) => [`${quizId}-${i + 1}`, r] as const));
    quizzes.set(quizId, { kind, items, ...(unit ? { unit } : {}) });
    return {
      quizId,
      kind,
      ...(unit ? { unitId: unit.id, passThreshold: 0.8 } : {}),
      items: [...items].map(([itemId, { unitId, ex }]) => ({ itemId, unitId, type: ex.type, prompt: L(ex.prompt), ...(ex.code ? { code: L(ex.code) } : {}), choices: ex.choices.map(L) })),
    };
  };

  const grade = (quizId: string, kind: Quiz["kind"], answers: Answers) => {
    const q = quizzes.get(quizId);
    if (!q || q.kind !== kind) throw notFound("퀴즈가 없습니다.");
    const review = [...q.items].map(([itemId, r]): QuizItemReview => {
      const chosen = answers[itemId] ?? null;
      const correct = chosen === r.ex.answer;
      const wrong = chosen === null ? undefined : r.ex.feedback[String(chosen)];
      return { itemId, chosen, correct, correctIndex: r.ex.answer, feedback: L(correct || !wrong ? r.ex.correct : wrong), backlink: `${r.unitId}/${r.lessonId}#${r.ex.id}` };
    });
    return { q, review, score: review.filter((i) => i.correct).length, outcomes: review.map((i) => i.correct) };
  };

  return {
    course: () =>
      wait((): CourseView => ({
        units: FAKE_UNITS.map((u) => ({
          ...u,
          skill: u.skill as CourseView["units"][number]["skill"],
          title: L(u.title),
          lessonTitles: u.lessonTitles.map(L),
          locales: ["ko", "en", "zh"],
          progress: progress(u),
        })),
        placement,
        next: next(),
      })),
    lesson: (unitId, lessonId) =>
      wait(() => {
        const l = lessonOf(unitId, lessonId);
        const blocks = l.blocks.map((b) =>
          b.kind === "prose" ? { ...b, markdown: L(b.markdown) } : { kind: b.kind, id: b.id, type: b.type, prompt: L(b.prompt), ...(b.code ? { code: L(b.code) } : {}), choices: b.choices.map(L) },
        );
        return {
          lesson: { id: l.id, unitId, title: L(l.title), tags: l.tags, blocks },
          solved: exercises(l).filter((e) => solved.has(`${unitId}/${lessonId}#${e.id}`)).map((e) => e.id),
          completed: completed.has(`${unitId}/${lessonId}`),
        };
      }),
    lessonAnswer: (unitId, lessonId, req) =>
      wait(() => {
        const ex = exercises(lessonOf(unitId, lessonId)).find((e) => e.id === req.exerciseId);
        if (!ex) throw notFound("연습 문제가 없습니다.");
        if (req.giveUp) return { correct: false, correctIndex: ex.answer, feedback: L(ex.correct) };
        if (req.choice === null || !ex.choices[req.choice]) throw new ApiError(400, { code: "invalid_input", message: "보기를 골라 주세요." });
        if (req.choice !== ex.answer) return { correct: false, feedback: L(ex.feedback[String(req.choice)] ?? { ko: "" }) };
        solved.add(`${unitId}/${lessonId}#${ex.id}`);
        return { correct: true, correctIndex: ex.answer, feedback: L(ex.correct) };
      }),
    lessonComplete: (unitId, lessonId) =>
      wait(() => {
        lessonOf(unitId, lessonId);
        completed.add(`${unitId}/${lessonId}`);
        return progress(unitOf(unitId)!);
      }),
    startCheckpoint: (unitId) =>
      wait(() => {
        const unit = unitOf(unitId);
        const refs = refsOf(unitId);
        if (!unit || refs.length === 0) throw notFound("가짜 API 샘플에는 u01, u02만 있습니다.");
        return newQuiz("checkpoint", spread(refs, 8), unit);
      }),
    submitCheckpoint: (quizId, req) =>
      wait(() => {
        const prev = results.get(quizId);
        if (prev) return prev as CheckpointResult;
        const { q, review, score, outcomes } = grade(quizId, "checkpoint", req.answers);
        const unit = q.unit!;
        const ok = score / review.length >= 0.8;
        const cp = checkpoints.get(unit.id);
        checkpoints.set(unit.id, { passed: ok || !!cp?.passed, best: Math.max(cp?.best ?? 0, score / review.length) });
        const change = deps.rate(unit.skill, outcomes, LEVEL_DIFFICULTY[unit.level] ?? 1000);
        const result: CheckpointResult = { quizId, unitId: unit.id, score, total: review.length, passed: ok, review, ratingChanges: [change] };
        results.set(quizId, result);
        return result;
      }),
    startPlacement: () =>
      wait(() => {
        const [a, b] = [spread(refsOf("u01-values"), 6), spread(refsOf("u02-functions-pipes"), 6)];
        return newQuiz("placement", a.flatMap((r, i) => [r, ...(b[i] ? [b[i]] : [])]));
      }),
    submitPlacement: (quizId, req) =>
      wait(() => {
        const prev = results.get(quizId);
        if (prev) return prev as PlacementResult;
        const { review, score, outcomes } = grade(quizId, "placement", req.answers);
        const ratio = score / review.length;
        const band = ratio >= 0.8 ? "advanced" : ratio >= 0.5 ? "intermediate" : "beginner";
        const maxLevel = { advanced: 4, intermediate: 1, beginner: 0 }[band];
        deps.rate("gleam-basics", outcomes, 1000);
        placement = {
          quizId,
          score,
          total: review.length,
          band,
          unitsPassed: FAKE_UNITS.filter((u) => u.level <= maxLevel).map((u) => u.id),
          recommendation: band === "advanced" ? "training" : "course",
          review,
          completedAt: deps.iso(),
        };
        results.set(quizId, placement);
        return placement;
      }),
  };
}
