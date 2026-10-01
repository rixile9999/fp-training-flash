import type { RatingChange, Skill } from "@fp/api-contract";
import { useI18n } from "../i18n/I18n.tsx";
import { Icon } from "./Icon.tsx";
import { skillName } from "./labels.ts";

/** Skill name, then "before -> after (+delta)" with the provisional badge. */
export function RatingLine({ change: rc, skills }: { readonly change: RatingChange; readonly skills: readonly Skill[] }) {
  const { t } = useI18n();
  const up = rc.after >= rc.before;
  return (
    <>
      <p className="rating-skill">{skillName(skills, rc.skillId)}</p>
      <p className="rating-change">
        <span className="mono rating-before">{rc.before}</span>
        <Icon name="arrowRight" label={t("rating.arrow")} />
        <span className="mono rating-after">{rc.after}</span>
        <span className={`rating-delta mono ${up ? "is-up" : "is-down"}`}>({`${up ? "+" : ""}${rc.after - rc.before}`})</span>
        {rc.provisional && <span className="badge-provisional">{t("common.provisional")}</span>}
      </p>
    </>
  );
}
