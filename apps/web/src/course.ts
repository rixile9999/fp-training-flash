/** Course navigation as plain data (App state). */
import type { CourseView } from "@fp/api-contract";
import type { CourseUnit, NextStep } from "./api/types.ts";

export type CourseRoute =
  | { readonly screen: "map" }
  | { readonly screen: "unit"; readonly unitId: string }
  | { readonly screen: "lesson"; readonly unitId: string; readonly lessonId: string; readonly focus?: string }
  | { readonly screen: "checkpoint"; readonly unitId: string }
  | { readonly screen: "placement" };

export const MAP: CourseRoute = { screen: "map" };

export function routeOf(next: NextStep): CourseRoute {
  if (next.kind === "lesson") return { screen: "lesson", unitId: next.unitId, lessonId: next.lessonId };
  if (next.kind === "checkpoint") return { screen: "checkpoint", unitId: next.unitId };
  return MAP;
}

/** "<unitId>/<lessonId>#<exerciseId>" (QuizItemReview.backlink) -> lesson route focused on the exercise. */
export function parseBacklink(link: string): CourseRoute | null {
  const m = /^([^/#]+)\/([^/#]+)(?:#(.+))?$/.exec(link);
  if (!m) return null;
  return { screen: "lesson", unitId: m[1]!, lessonId: m[2]!, ...(m[3] ? { focus: m[3] } : {}) };
}

/** After finishing a lesson: the unit's next lesson, else its checkpoint (unless passed), else the course's next step. */
export function stepAfterLesson(course: CourseView, unitId: string, lessonId: string): CourseRoute {
  const unit = course.units.find((u) => u.id === unitId);
  if (!unit) return routeOf(course.next);
  const i = unit.lessonIds.indexOf(lessonId);
  const following = i >= 0 ? unit.lessonIds[i + 1] : undefined;
  if (following) return { screen: "lesson", unitId, lessonId: following };
  if (!unit.progress.checkpointPassed) return { screen: "checkpoint", unitId };
  return routeOf(course.next);
}

export function lessonTitle(unit: CourseUnit, lessonId: string): string {
  return unit.lessonTitles[unit.lessonIds.indexOf(lessonId)] ?? lessonId;
}

/** Units grouped by level (1-4), each sorted by course order. */
export function unitsByLevel(units: readonly CourseUnit[]): [number, CourseUnit[]][] {
  const levels = new Map<number, CourseUnit[]>();
  for (const u of [...units].sort((a, b) => a.order - b.order)) {
    const list = levels.get(u.level) ?? [];
    list.push(u);
    levels.set(u.level, list);
  }
  return [...levels].sort((a, b) => a[0] - b[0]);
}
