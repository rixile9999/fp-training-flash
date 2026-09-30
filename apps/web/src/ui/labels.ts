/** Korean display labels and small formatting helpers shared by screens. */
import type { ExerciseDetail, Skill, TrialRun } from "@fp/api-contract";

type Outcome = TrialRun["outcome"];

export const KIND_LABEL: Record<ExerciseDetail["kind"], string> = {
  implement: "구현",
  fix: "버그 수정",
  refactor: "리팩터링",
  predict: "결과 예측",
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  passed: "모든 테스트 통과",
  failed_tests: "테스트 실패",
  too_slow: "성능 기준 미달",
  compile_error: "컴파일 오류",
  timeout: "시간 초과",
  rejected: "제출 거부됨",
  system_error: "채점 시스템 오류",
};

const ERROR_TAG_LABEL: Record<string, string> = {
  drops_items_with_filter: "filter로 남겨야 할 원소를 버림",
  forgets_none_case: "None 경우를 빠뜨림",
  discount_per_line: "할인을 줄마다 반복 적용",
  off_by_one: "경계값 하나 차이",
};

export function errorTagLabel(tag: string): string {
  return ERROR_TAG_LABEL[tag] ?? tag.replace(/_/g, " ");
}

export function skillName(skills: readonly Skill[], id: string): string {
  return skills.find((s) => s.id === id)?.name ?? id;
}

export function percent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** "오늘", "내일", "3일 후", "2일 지남" relative to now. */
export function relativeDay(iso: string, nowMs: number): string {
  const day = 86_400_000;
  const startOf = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diff = Math.round((startOf(Date.parse(iso)) - startOf(nowMs)) / day);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff > 1) return `${diff}일 후`;
  return `${-diff}일 지남`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
