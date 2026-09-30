/**
 * Deterministic coaching built only from execution evidence. Used when no LLM is configured and
 * whenever the LLM call fails, times out, or returns output that fails validation.
 */
import type { ExerciseDetail, RubricItem } from "@fp/content/contract";
import type { Evaluation, HelpUsed, TestResult } from "@fp/grading/contract";
import type { ErrorTagStat } from "@fp/learner/contract";
import type { SubmissionId } from "@fp/kernel";
import type { CoachingFeedback, FeedbackEvidence, RubricNote } from "../contract/index.ts";

export const RULE_BASED_VERSION = "rules-v1";
export const RULE_BASED_MODEL = "rule-based";

export interface RuleFeedbackInput {
  readonly submissionId: SubmissionId;
  readonly evaluation: Evaluation;
  readonly rubric: readonly RubricItem[];
  readonly errorTagHistory: readonly ErrorTagStat[];
  readonly createdAt: string;
}

export function isFailing(t: TestResult): boolean {
  return t.status !== "passed";
}

export function ruleBasedFeedback(input: RuleFeedbackInput): CoachingFeedback {
  const { evaluation } = input;
  const parts = describeOutcome(input);
  const rubricNotes = rubricNotesFrom(evaluation, input.rubric);
  return {
    submissionId: input.submissionId,
    summary: parts.summary,
    evidence: parts.evidence,
    priorities: parts.priorities.slice(0, 2),
    nextAction: parts.nextAction,
    rubricNotes: evaluation.outcome === "system_error" ? [] : rubricNotes,
    source: "rule_based",
    promptVersion: RULE_BASED_VERSION,
    createdAt: input.createdAt,
  };
}

interface Parts {
  summary: string;
  evidence: FeedbackEvidence[];
  priorities: string[];
  nextAction: string;
}

function describeOutcome(input: RuleFeedbackInput): Parts {
  const ev = input.evaluation;
  switch (ev.outcome) {
    case "compile_error": {
      const diag = ev.compileDiagnostics.find((d) => d.severity === "error") ?? ev.compileDiagnostics[0];
      const where = diag?.line !== undefined ? `${diag.line}행` : "코드";
      return {
        summary: "컴파일 오류 때문에 테스트가 실행되지 않았습니다.",
        evidence: diag
          ? [withLine({ text: `컴파일 오류: ${diag.message}` }, diag.line)]
          : [{ text: "컴파일러가 오류를 보고했지만 세부 메시지가 없습니다." }],
        priorities: [`${where}의 컴파일 오류를 먼저 해결하세요.`],
        nextAction: `${where}의 오류 메시지를 읽어 보세요. 컴파일러는 어떤 타입(또는 이름)을 기대했고, 실제로는 무엇을 받았나요?`,
      };
    }
    case "failed_tests": {
      const failing = ev.tests.filter(isFailing);
      const first = failing[0];
      if (!first) {
        return {
          summary: "일부 요구사항을 충족하지 못했습니다.",
          evidence: unmetRequirements(ev),
          priorities: ["충족되지 않은 요구사항을 다시 확인하세요."],
          nextAction: "문제 설명의 요구사항 중 아직 처리하지 않은 경우가 무엇인지 한 줄로 적어 보세요.",
        };
      }
      const priorities = [`'${first.name}' 테스트가 기대하는 동작을 먼저 맞추세요.`];
      const recurring = first.errorTag ? recurringTag(first.errorTag, input.errorTagHistory) : undefined;
      if (recurring) priorities.push(`이전에도 같은 유형의 실수(${recurring.tag})가 ${recurring.count}회 있었습니다. 패턴을 점검해 보세요.`);
      return {
        summary: `테스트 ${ev.tests.length}개 중 ${failing.length}개가 실패했습니다.`,
        evidence: failing.slice(0, 3).map((t) => ({
          text: `'${t.name}' ${statusText(t)}${t.message ? `: ${t.message}` : ""}${t.errorTag ? ` (오류 유형: ${t.errorTag})` : ""}`,
          testId: t.id,
        })),
        priorities,
        nextAction: `'${first.name}' 테스트의 입력을 손으로 따라가 보세요. 여러분의 함수는 어떤 값을 돌려주고, 테스트는 어떤 값을 기대하나요?`,
      };
    }
    case "too_slow": {
      const ratio = ev.performance?.ratio;
      return {
        summary: "모든 테스트는 통과했지만, 큰 입력에서 기준보다 너무 느립니다.",
        evidence: [
          {
            text:
              ratio !== undefined
                ? `가장 큰 입력에서 기준 풀이보다 약 ${ratio.toFixed(1)}배의 연산을 사용했습니다.`
                : "성능 측정에서 기준을 넘었습니다.",
          },
        ],
        priorities: ["입력 크기가 커질 때 반복되는 작업(리스트를 여러 번 순회하거나 끝에 붙이기 등)을 찾으세요."],
        nextAction: "입력 길이가 두 배가 되면 여러분의 코드가 하는 일은 몇 배가 되나요? 가장 안쪽 반복을 찾아 적어 보세요.",
      };
    }
    case "timeout":
      return {
        summary: "실행 시간이 제한을 넘었습니다.",
        evidence: [{ text: "테스트가 시간 제한 안에 끝나지 않았습니다." }],
        priorities: ["재귀가 항상 종료 조건(기저 사례)에 도달하는지 확인하세요."],
        nextAction: "재귀 호출마다 입력이 실제로 작아지나요? 빈 리스트(또는 0)일 때 무엇을 돌려주는지 확인해 보세요.",
      };
    case "rejected": {
      const reason = ev.rejectionReasons?.[0] ?? "허용되지 않는 코드가 포함되어 있습니다.";
      return {
        summary: "제출 코드가 사전 검사에서 거부되어 실행되지 않았습니다.",
        evidence: [{ text: reason }],
        priorities: ["거부 사유가 된 부분을 제거하고 순수 Gleam 코드로 작성하세요."],
        nextAction: "거부 사유에 나온 구문을 코드에서 찾아 지우고, 같은 일을 표준 라이브러리로 할 방법을 생각해 보세요.",
      };
    }
    case "system_error":
      return {
        summary: "죄송합니다. 채점 시스템에 문제가 생겨 코드를 평가하지 못했습니다. 여러분의 실수가 아니며 학습 기록에도 반영되지 않습니다.",
        evidence: [],
        priorities: ["잠시 후 같은 코드를 다시 제출해 주세요."],
        nextAction: "잠시 후 다시 제출해 보세요. 문제가 계속되면 알려 주세요.",
      };
    case "passed": {
      const flagged = ev.rubricChecks.find((c) => c.status === "flagged");
      const rubricItem = flagged
        ? input.rubric.find((r) => r.id === flagged.rubricId)
        : input.rubric[0];
      const suggestion = flagged
        ? `${flagged.rubricId}: ${flagged.message ?? rubricItem?.title ?? "코드 품질 기준을 확인하세요."}`
        : rubricItem
          ? `${rubricItem.id}(${rubricItem.title}) 관점에서 코드를 다시 읽어 보세요.`
          : "함수 이름과 패턴 매칭이 의도를 잘 드러내는지 다시 읽어 보세요.";
      return {
        summary: "모든 테스트를 통과했습니다. 잘했어요!",
        evidence: [{ text: `테스트 ${ev.tests.length}개가 모두 통과했습니다.` }],
        priorities: [suggestion],
        nextAction: rubricItem
          ? `${rubricItem.id} 기준(${rubricItem.title})을 더 잘 만족하도록 한 부분만 고친다면 어디를 고치겠어요?`
          : "같은 동작을 더 짧거나 더 읽기 쉽게 쓸 수 있는 부분이 있는지 찾아보세요.",
      };
    }
  }
}

function withLine(e: { text: string }, line: number | undefined): FeedbackEvidence {
  return line === undefined ? e : { ...e, line };
}

function statusText(t: TestResult): string {
  if (t.status === "timeout") return "시간 초과";
  if (t.status === "error") return "실행 오류";
  return "실패";
}

function unmetRequirements(ev: Evaluation): FeedbackEvidence[] {
  const unmet = ev.requirements.filter((r) => r.status === "unmet");
  if (unmet.length === 0) return [{ text: "평가 결과 정답으로 판정되지 않았습니다." }];
  return unmet.slice(0, 3).map((r) => ({ text: `미충족 요구사항: ${r.description}` }));
}

function recurringTag(tag: string, history: readonly ErrorTagStat[]): ErrorTagStat | undefined {
  const stat = history.find((s) => s.tag === tag);
  return stat && stat.count >= 2 ? stat : undefined;
}

/** Rubric notes from grading's deterministic checks, restricted to the exercise's rubric ids. */
export function rubricNotesFrom(ev: Evaluation, rubric: readonly RubricItem[]): RubricNote[] {
  const ids = new Set(rubric.map((r) => r.id));
  return ev.rubricChecks
    .filter((c) => ids.has(c.rubricId))
    .map((c) => {
      const item = rubric.find((r) => r.id === c.rubricId);
      return c.status === "flagged"
        ? { rubricId: c.rubricId, verdict: "suggestion" as const, text: c.message ?? `${item?.title ?? c.rubricId} 기준을 다시 확인하세요.` }
        : { rubricId: c.rubricId, verdict: "good" as const, text: `${item?.title ?? c.rubricId} 기준을 잘 지켰습니다.` };
    });
}

export interface RuleChatInput {
  readonly exercise: ExerciseDetail;
  readonly helpUsed: HelpUsed;
  readonly evaluation?: Evaluation;
  readonly conceptNoteTitles: readonly string[];
}

/** Short guidance when no LLM is available: points to evidence, the next hint, and notes. */
export function ruleBasedChatReply(input: RuleChatInput): string {
  const lines: string[] = ["지금은 AI 코치를 사용할 수 없어 간단한 안내만 드릴게요."];
  const ev = input.evaluation;
  if (ev) {
    if (ev.outcome === "compile_error") {
      const d = ev.compileDiagnostics.find((x) => x.severity === "error") ?? ev.compileDiagnostics[0];
      if (d) lines.push(`최근 제출은 ${d.line !== undefined ? `${d.line}행에서 ` : ""}컴파일 오류가 났습니다: ${d.message}`);
    } else {
      const failing = ev.tests.find(isFailing);
      if (failing) {
        lines.push(`최근 제출에서 '${failing.name}' 테스트가 ${statusText(failing)}했습니다${failing.message ? ` (${failing.message})` : ""}. 이 테스트가 기대하는 값과 실제 값이 어디서 달라지는지 확인해 보세요.`);
      } else if (ev.outcome === "passed") {
        lines.push("최근 제출은 모든 테스트를 통과했습니다. 루브릭 기준으로 코드를 다듬어 보세요.");
      }
    }
  }
  const available = input.exercise.hints.map((h) => h.level).filter((l) => l > input.helpUsed.maxHintLevel);
  const next = available.length > 0 ? Math.min(...available) : undefined;
  if (next !== undefined) lines.push(`막혔다면 힌트 ${next}단계를 열어 보세요.`);
  const note = input.conceptNoteTitles[0];
  if (note) lines.push(`개념 노트 「${note}」도 도움이 됩니다.`);
  lines.push("먼저, 지금 함수가 받는 입력과 돌려줘야 하는 출력을 한 문장으로 설명해 볼 수 있나요?");
  return lines.join("\n");
}
