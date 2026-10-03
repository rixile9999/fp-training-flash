import { describe, expect, it } from "vitest";
import type { ContentCatalog, Lesson, LessonAnswerKey, LessonUnitSummary } from "@fp/content/contract";
import type { SkillId } from "@fp/kernel";
import { formatLessonSummary, verifyLessons } from "../src/lessons.ts";

const unit: LessonUnitSummary = {
  id: "u01",
  title: "값",
  order: 1,
  level: 1,
  skill: "gleam-basics" as SkillId,
  prerequisites: [],
  lessonIds: ["l01"],
  lessonTitles: ["값과 let"],
  locales: ["ko", "en"],
};

const lesson: Lesson = {
  id: "l01",
  unitId: "u01",
  title: "값과 let",
  tags: [],
  blocks: [
    { kind: "prose", id: "intro", markdown: "..." },
    { kind: "exercise", id: "a", type: "choice", prompt: "?", choices: ["x", "y", "z"] },
    { kind: "exercise", id: "b", type: "predict", prompt: "?", code: "1 + 1", choices: ["1", "2"] },
  ],
};

const keys: Record<string, LessonAnswerKey> = {
  a: { unitId: "u01", lessonId: "l01", exerciseId: "a", answer: 1, correctFeedback: "ok", choiceFeedback: { 0: "no", 2: "no" } },
  b: { unitId: "u01", lessonId: "l01", exerciseId: "b", answer: 1, correctFeedback: "ok", choiceFeedback: { 0: "no" } },
};

/** Only the lesson methods are used by verifyLessons. */
function fakeCatalog(over: { lesson?: Lesson | null; keys?: Record<string, LessonAnswerKey> } = {}): ContentCatalog {
  const unused = async (): Promise<never> => {
    throw new Error("not used");
  };
  return {
    listSkills: unused,
    getSkill: unused,
    listExercises: unused,
    getExercise: unused,
    getGradingSpec: unused,
    getReferenceMaterial: unused,
    getConceptNotes: unused,
    getTheoryTopics: unused,
    listTheoryTopics: unused,
    currentBundle: unused,
    listLessonUnits: async () => [unit],
    getLesson: async () => (over.lesson === undefined ? lesson : over.lesson),
    getLessonAnswer: async (_u, _l, id) => (over.keys ?? keys)[id] ?? null,
    listRecallDecks: async () => [],
    listRecallCards: async () => [],
    getRecallCard: async () => null,
    getRecallCardKey: async () => null,
  };
}

describe("verifyLessons", () => {
  it("counts units, lessons, blocks and fully translated units", async () => {
    const r = await verifyLessons(fakeCatalog());
    expect(r.problems).toEqual([]);
    expect(r.counts).toEqual({ units: 1, lessons: 1, prose: 1, choice: 1, predict: 1, completeUnits: { ko: 1, en: 1, zh: 0 } });
    expect(formatLessonSummary(r.counts, ["en", "zh"])).toBe(
      "1 units, 1 lessons (1 prose, 2 exercises: 1 choice, 1 predict); fully translated units: en 1/1, zh 0/1",
    );
  });

  it("reports missing lessons, leaked answers and inconsistent answer keys", async () => {
    expect((await verifyLessons(fakeCatalog({ lesson: null }), ["ko"])).problems).toEqual(["u01/l01 [ko]: listed but not served by getLesson"]);
    const leaky = { ...lesson, answer: 1 } as Lesson;
    expect((await verifyLessons(fakeCatalog({ lesson: leaky }), ["ko"])).problems).toEqual([
      "u01/l01 [ko]: the learner view contains answers or feedback",
    ]);
    const bad = {
      a: { ...keys.a, answer: 3 } as LessonAnswerKey,
      b: { ...keys.b, correctFeedback: " ", choiceFeedback: {} } as LessonAnswerKey,
    };
    expect((await verifyLessons(fakeCatalog({ keys: bad }), ["ko"])).problems).toEqual([
      "u01/l01 [ko]#a: answer 3 is not one of 3 choices",
      "u01/l01 [ko]#a: no feedback for wrong choice 1",
      "u01/l01 [ko]#b: empty feedback for the correct answer",
      "u01/l01 [ko]#b: no feedback for wrong choice 0",
    ]);
    expect((await verifyLessons(fakeCatalog({ keys: { a: keys.a as LessonAnswerKey } }), ["ko"])).problems).toEqual([
      "u01/l01 [ko]#b: no answer key",
    ]);
  });
});
