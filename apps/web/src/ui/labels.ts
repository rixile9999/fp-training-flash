/** Display labels for API enums and small formatting helpers shared by screens (text comes from the i18n catalog). */
import type { ExerciseDetail, Hint, Session, Skill, TrialRun } from "@fp/api-contract";
import type { Translator } from "../i18n/translator.ts";

type Outcome = TrialRun["outcome"];

export const kindLabel = (tr: Translator, kind: ExerciseDetail["kind"]): string => tr.t(`kind.${kind}`);
export const outcomeLabel = (tr: Translator, outcome: Outcome): string => tr.t(`outcome.${outcome}`);
export const itemKindLabel = (tr: Translator, kind: Session["items"][number]["kind"]): string => tr.t(`itemKind.${kind}`);
export const hintKindLabel = (tr: Translator, kind: Hint["kind"]): string => tr.t(`hintKind.${kind}`);

/** Known tags have a translated label; unknown ones are shown as their id with spaces. */
export function errorTagLabel(tr: Translator, tag: string): string {
  const id = `errorTag.${tag}`;
  return tr.has(id) ? tr.t(id as Parameters<Translator["t"]>[0]) : tag.replace(/_/g, " ");
}

export function skillName(skills: readonly Skill[], id: string): string {
  return skills.find((s) => s.id === id)?.name ?? id;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
