/**
 * Lesson checks of content CI (content/lessons, docs/design/lessons.md). The content module loader already rejects
 * structural problems (ContentIssue); this walks the imported catalog the way the lessons module will use it, in every
 * locale, and counts what is there. Answers are choices, so nothing is compiled or run.
 */
import { SUPPORTED_LOCALES, type Locale } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";

export interface LessonCounts {
  readonly units: number;
  readonly lessons: number;
  readonly prose: number;
  readonly choice: number;
  readonly predict: number;
  /** Units listing the locale in LessonUnitSummary.locales (fully translated). */
  readonly completeUnits: Readonly<Record<Locale, number>>;
}

export interface LessonCheck {
  readonly counts: LessonCounts;
  /** Failures: the catalog does not serve what the unit list promises, or answer keys are inconsistent. */
  readonly problems: readonly string[];
}

const LEAKED = /"(answer|feedback|correctFeedback|choiceFeedback)"/;

export async function verifyLessons(catalog: ContentCatalog, locales: readonly Locale[] = SUPPORTED_LOCALES): Promise<LessonCheck> {
  const problems: string[] = [];
  const completeUnits = Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, 0])) as Record<Locale, number>;
  let units = 0;
  let lessons = 0;
  let prose = 0;
  let choice = 0;
  let predict = 0;
  const first = locales[0];
  for (const locale of locales) {
    const counting = locale === first;
    const list = await catalog.listLessonUnits(locale);
    if (counting) units = list.length;
    for (const unit of list) {
      if (unit.locales.includes(locale)) completeUnits[locale]++;
      if (unit.lessonTitles.length !== unit.lessonIds.length) problems.push(`${unit.id} [${locale}]: ${unit.lessonTitles.length} lesson titles for ${unit.lessonIds.length} lessons`);
      for (const lessonId of unit.lessonIds) {
        const where = `${unit.id}/${lessonId} [${locale}]`;
        const lesson = await catalog.getLesson(unit.id, lessonId, locale);
        if (!lesson) {
          problems.push(`${where}: listed but not served by getLesson`);
          continue;
        }
        if (counting) lessons++;
        if (LEAKED.test(JSON.stringify(lesson))) problems.push(`${where}: the learner view contains answers or feedback`);
        for (const block of lesson.blocks) {
          if (block.kind === "prose") {
            if (counting) prose++;
            continue;
          }
          if (counting) block.type === "choice" ? choice++ : predict++;
          const key = await catalog.getLessonAnswer(unit.id, lessonId, block.id, locale);
          if (!key) {
            problems.push(`${where}#${block.id}: no answer key`);
            continue;
          }
          if (!Number.isInteger(key.answer) || key.answer < 0 || key.answer >= block.choices.length) {
            problems.push(`${where}#${block.id}: answer ${key.answer} is not one of ${block.choices.length} choices`);
          }
          if (key.correctFeedback.trim() === "") problems.push(`${where}#${block.id}: empty feedback for the correct answer`);
          for (let i = 0; i < block.choices.length; i++) {
            if (i !== key.answer && !key.choiceFeedback[i]?.trim()) problems.push(`${where}#${block.id}: no feedback for wrong choice ${i}`);
          }
        }
      }
    }
  }
  return { counts: { units, lessons, prose, choice, predict, completeUnits }, problems };
}

/** One summary line, e.g. "15 units, 64 lessons (150 prose, 228 exercises: 79 choice, 149 predict); fully translated units: en 14/15, zh 15/15". */
export function formatLessonSummary(c: LessonCounts, translated: readonly Locale[]): string {
  const t = translated.map((l) => `${l} ${c.completeUnits[l]}/${c.units}`).join(", ");
  return `${c.units} units, ${c.lessons} lessons (${c.prose} prose, ${c.choice + c.predict} exercises: ${c.choice} choice, ${c.predict} predict)` +
    (t ? `; fully translated units: ${t}` : "");
}
