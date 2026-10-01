/** Maps a session and the UI phase onto the five-step stepper shown in the header. */
import type { Session } from "@fp/api-contract";

export type StepKey = "review" | "focus" | "feedback" | "variation" | "wrapup";
export type StepState = "done" | "current" | "upcoming";
export type Phase = "work" | "feedback";

/** Labels come from the i18n catalog as `step.<key>`. */
export const STEPS: readonly { readonly key: StepKey }[] = [{ key: "review" }, { key: "focus" }, { key: "feedback" }, { key: "variation" }, { key: "wrapup" }];

type Item = Session["items"][number];

export function currentStep(session: Session, activeIndex: number | null, phase: Phase, completed: boolean): StepKey {
  if (completed) return "wrapup";
  const item = activeIndex === null ? undefined : session.items[activeIndex];
  if (!item) return "wrapup";
  switch (item.kind) {
    case "review":
      return "review";
    case "variation":
      return "variation";
    case "focus":
    case "challenge":
      return phase === "feedback" ? "feedback" : "focus";
  }
}

export function stepStates(session: Session, activeIndex: number | null, phase: Phase, completed: boolean): Record<StepKey, StepState> {
  const cur = STEPS.findIndex((s) => s.key === currentStep(session, activeIndex, phase, completed));
  const out = {} as Record<StepKey, StepState>;
  STEPS.forEach((s, i) => {
    out[s.key] = i < cur ? "done" : i === cur ? "current" : "upcoming";
  });
  return out;
}
