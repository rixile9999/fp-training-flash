/**
 * In-memory fake of the HTTP API (VITE_FAKE_API=1). Same shape as createApiClient so the UI can be
 * developed and tested without a backend. Grading is simulated from the code text (see fake-data rules);
 * rating updates follow the real policy's visible rules (first attempt, hint level <= 2, no explanation).
 */
import { ApiError } from "@fp/api-contract";
import type {
  ApiClient,
  ChatMessage,
  CoachingFeedback,
  ExerciseSummary,
  Hint,
  IssuedToken,
  Locale,
  ProgressView,
  RatingChange,
  Session,
  SessionSummary,
  Submission,
  SubmissionView,
  TokenInfo,
  TrialRun,
  User,
} from "@fp/api-contract";
import { isLocale } from "../i18n/locale.ts";
import { CONCEPT_NOTES, FAKE_EXERCISES, THEORY_TOPICS, localizedSkills } from "./fake-data.ts";
import { createFakeCourse } from "./fake-lessons.ts";
import type { FakeExercise } from "./fake-data.ts";
import type {
  ErrorTagStat,
  Evaluation,
  HelpUsed,
  RequirementResult,
  ReviewItem,
  RubricCheckResult,
  SessionItem,
  SkillEstimate,
  TestResult,
} from "./types.ts";

export interface FakeApiOptions {
  /** Epoch milliseconds; defaults to the wall clock (UI-only fake, not domain logic). */
  readonly now?: () => number;
  /** Artificial delay for every call. */
  readonly latencyMs?: number;
  /** Extra delay for coaching feedback, to exercise the loading state. */
  readonly feedbackLatencyMs?: number;
}

type SkillId = SkillEstimate["skillId"];
type Ledger = { maxHint: number; concept: Set<string>; theory: Set<string>; explanation: boolean; coachMessages: number };

const DAY = 86_400_000;
const LANG = "gleam" as const;

const TAG_TEXT: Record<string, { what: string; next: string }> = {
  drops_items_with_filter: {
    what: "list.filter는 조건에 맞지 않는 원소를 버립니다. 쿠폰이 다른 주문도 결과에 남아야 합니다.",
    next: "개수를 유지하는 변환(list.map) 안에서 case로 쿠폰 일치 여부를 나눠 보세요.",
  },
  discount_per_line: {
    what: "할인을 줄마다 계산하면 정수 나눗셈의 내림 오차가 줄 수만큼 쌓입니다.",
    next: "fold로 합계만 먼저 구하고, 할인은 fold가 끝난 뒤 한 번만 계산하세요.",
  },
};

export function createFakeApi(opts: FakeApiOptions = {}): ApiClient {
  const now = opts.now ?? (() => Date.now());
  const iso = (offsetMs = 0) => new Date(now() + offsetMs).toISOString();
  const latency = opts.latencyMs ?? 0;
  const wait = <T>(value: () => T, ms = latency): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () => {
        try {
          resolve(value());
        } catch (e) {
          reject(e);
        }
      };
      if (ms > 0) setTimeout(run, ms);
      else queueMicrotask(run);
    });
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${++seq}`;

  let user: User | null = null;
  /** Accounts by display name, so a returning learner keeps their locale. */
  const users = new Map<string, User>();
  const demoUser = (): User => ({ id: "user-demo" as User["id"], displayName: "학습자", locale: "ko", createdAt: iso() });
  const locale = (): Locale => user?.locale ?? "ko";
  const tokens: TokenInfo[] = [];
  const ledgers = new Map<string, Ledger>();
  const submissions = new Map<string, SubmissionView>();
  const byIdempotency = new Map<string, string>();
  const attempts = new Map<string, number>();
  let session: Session | null = null;

  const skill = (s: string) => s as SkillId;
  const estimates = new Map<string, SkillEstimate>(
    (
      [
        ["data-transform", 1310, 140, 3],
        ["pattern-matching", 1420, 85, 9],
        ["option-result", 1185, 170, 2],
      ] as const
    ).map(([id, rating, deviation, obs]) => [
      id,
      { skillId: skill(id), language: LANG, rating, deviation, ratedObservations: obs, provisional: obs < 5, updatedAt: iso(-2 * DAY), lastIndependentSuccessAt: iso(-3 * DAY) },
    ]),
  );
  const reviews = new Map<string, ReviewItem>([
    ["option-result", { skillId: skill("option-result"), language: LANG, dueAt: iso(-2 * 3_600_000), intervalDays: 1, lastResult: "failure" }],
    ["data-transform", { skillId: skill("data-transform"), language: LANG, dueAt: iso(DAY), intervalDays: 2, lastResult: "success" }],
    ["pattern-matching", { skillId: skill("pattern-matching"), language: LANG, dueAt: iso(4 * DAY), intervalDays: 6, lastResult: "success" }],
  ]);
  const errorTags = new Map<string, ErrorTagStat>([
    ["drops_items_with_filter", { tag: "drops_items_with_filter", count: 2, lastSeenAt: iso(-2 * DAY) }],
    ["forgets_none_case", { tag: "forgets_none_case", count: 1, lastSeenAt: iso(-6 * DAY), lastResolvedAt: iso(-3 * DAY) }],
  ]);

  const notFound = (what: string) => new ApiError(404, { code: "not_found", message: `${what}을(를) 찾을 수 없습니다.` });
  const find = (id: string): FakeExercise => {
    const fx = FAKE_EXERCISES.find((f) => f.detail.id === id);
    if (!fx) throw notFound("문제");
    return fx;
  };
  const ledger = (exerciseId: string): Ledger => {
    let l = ledgers.get(exerciseId);
    if (!l) ledgers.set(exerciseId, (l = { maxHint: 0, concept: new Set(), theory: new Set(), explanation: false, coachMessages: 0 }));
    return l;
  };
  const helpUsed = (exerciseId: string): HelpUsed => {
    const l = ledger(exerciseId);
    return { maxHintLevel: l.maxHint, conceptNotesOpened: l.concept.size, theoryNotesOpened: l.theory.size, explanationViewed: l.explanation, coachMessages: l.coachMessages };
  };
  const revealed = (fx: FakeExercise): Hint[] => fx.detail.hints.filter((h) => h.level <= ledger(fx.detail.id).maxHint);
  const expectedSuccess = (skillId: string, difficulty: number) => {
    const r = estimates.get(skillId)?.rating ?? 1200;
    return Math.round((1 / (1 + 10 ** ((difficulty - r) / 400))) * 100) / 100;
  };

  function evaluate(fx: FakeExercise, code: string, includeHidden: boolean): Evaluation {
    const base = { compileDiagnostics: [], tests: [], requirements: [], rubricChecks: [], errorTags: [], evaluatedAt: iso(), durationMs: 840 };
    if (/@external/.test(code)) {
      return { ...base, outcome: "rejected", correctness: false, rejectionReasons: ["@external 사용은 허용되지 않습니다."] };
    }
    const tests = fx.tests.filter((t) => includeHidden || t.visibility === "public");
    const predict = fx.detail.predict;
    let failing: readonly string[] | "all";
    let message: string | undefined;
    if (predict) {
      const norm = (s: string) => s.replace(/\s+/g, "");
      failing = predict.acceptedAnswers.some((a) => norm(a) === norm(code)) ? [] : "all";
      message = `expected: ${predict.acceptedAnswers[0]}\n     got: ${code.trim() || "(빈 답)"}`;
    } else {
      const open = (code.match(/[{(\[]/g) ?? []).length;
      const close = (code.match(/[})\]]/g) ?? []).length;
      if (open !== close) {
        const line = code.split("\n").length;
        return {
          ...base,
          outcome: "compile_error",
          correctness: false,
          compileDiagnostics: [{ severity: "error", message: "Syntax error: 여는 괄호와 닫는 괄호의 수가 맞지 않습니다.", file: `src/${fx.detail.moduleName}.gleam`, line }],
          requirements: fx.requirements.map((r) => ({ id: r.id, description: r.description, status: "undetermined" })),
        };
      }
      const rule = fx.rules.find((r) => r.when.test(code));
      failing = rule ? rule.failing : "all";
      message = rule?.message;
    }
    const results: TestResult[] = tests.map((t) => {
      const failed = failing === "all" || failing.includes(t.id);
      const shownCode = t.visibility === "public" ? fx.detail.publicTests.find((p) => p.id === t.id)?.code : t.code;
      return {
        id: t.id,
        name: t.name,
        status: failed ? "failed" : "passed",
        visibility: t.visibility,
        ...(failed ? { message: message ?? t.failMessage } : {}),
        ...(failed && shownCode ? { code: shownCode } : {}),
        ...(failed && t.errorTag ? { errorTag: t.errorTag } : {}),
      };
    });
    const status = (id: string) => results.find((r) => r.id === id)?.status;
    const requirements: RequirementResult[] = fx.requirements.map((r) => ({
      id: r.id,
      description: r.description,
      status: r.testIds.length === 0 || r.testIds.some((t) => status(t) === undefined) ? "undetermined" : r.testIds.every((t) => status(t) === "passed") ? "met" : "unmet",
    }));
    const rubricChecks: RubricCheckResult[] = fx.detail.rubric.flatMap((item): RubricCheckResult[] => {
      const c = item.automatedCheck;
      if (!c || predict) return [];
      if (c.kind === "max_function_lines") {
        const longest = longestFunction(code);
        return [longest <= c.max ? { rubricId: item.id, status: "ok" } : { rubricId: item.id, status: "flagged", message: `가장 긴 함수가 ${longest}줄입니다 (기준 ${c.max}줄).` }];
      }
      const hit = new RegExp(c.pattern).test(code);
      const ok = c.kind === "require_pattern" ? hit : !hit;
      return [ok ? { rubricId: item.id, status: "ok" } : { rubricId: item.id, status: "flagged", message: c.message }];
    });
    const passed = results.every((r) => r.status === "passed");
    return {
      ...base,
      outcome: passed ? "passed" : "failed_tests",
      correctness: passed,
      tests: results,
      requirements,
      rubricChecks,
      errorTags: [...new Set(results.flatMap((r) => (r.errorTag ? [r.errorTag] : [])))],
      runner: { runner: "local", languageVersion: "gleam 1.12", runtimeVersion: "OTP 28" },
    };
  }

  function rate(fx: FakeExercise, sub: Submission, ev: Evaluation): RatingChange | null {
    const h = sub.helpUsed;
    for (const tag of ev.errorTags) {
      const prev = errorTags.get(tag);
      errorTags.set(tag, { tag, count: (prev?.count ?? 0) + 1, lastSeenAt: iso() });
    }
    const skillId = fx.detail.primarySkill;
    const success = ev.correctness;
    const interval = success ? Math.max(2, (reviews.get(skillId)?.intervalDays ?? 1) * 2) : 1;
    reviews.set(skillId, { skillId, language: LANG, dueAt: iso(interval * DAY), intervalDays: interval, lastResult: success ? "success" : "failure" });
    if (sub.attemptNo !== 1 || h.explanationViewed || h.maxHintLevel > 2) return null;
    const prev = estimates.get(skillId) ?? { skillId, language: LANG, rating: 1200, deviation: 200, ratedObservations: 0, provisional: true, updatedAt: iso() };
    const expected = 1 / (1 + 10 ** ((fx.detail.difficulty - prev.rating) / 400));
    const after = Math.round(prev.rating + 32 * ((success ? 1 : 0) - expected));
    const obs = prev.ratedObservations + 1;
    estimates.set(skillId, {
      ...prev,
      rating: after,
      deviation: Math.max(60, Math.round(prev.deviation * 0.9)),
      ratedObservations: obs,
      provisional: obs < 5,
      updatedAt: iso(),
      ...(success ? { lastIndependentSuccessAt: iso() } : {}),
    });
    return { skillId, before: prev.rating, after, provisional: obs < 5 };
  }

  function advance(s: Session, items: SessionItem[]): Session {
    const next = items.findIndex((i) => i.status === "pending" || i.status === "in_progress");
    if (next >= 0 && items[next]!.status === "pending") items[next] = { ...items[next]!, status: "in_progress" };
    return { ...s, items, currentIndex: next >= 0 ? next : null };
  }

  function recordInSession(sessionId: string | undefined, exerciseId: string, sub: Submission, ev: Evaluation) {
    if (!session || session.id !== sessionId || session.status !== "active") return;
    const items = [...session.items];
    const idx = items.findIndex((i) => i.exerciseId === exerciseId);
    if (idx < 0) return;
    const item = items[idx]!;
    items[idx] = { ...item, status: ev.correctness ? "passed" : "failed", submissionIds: [...item.submissionIds, sub.id] };
    if (ev.correctness) session = advance(session, items);
    else session = { ...session, items };
  }

  function feedbackFor(view: SubmissionView): CoachingFeedback {
    const ev = view.submission.evaluation!;
    const failed = ev.tests.filter((t) => t.status !== "passed");
    const tag = ev.errorTags[0];
    const tagText = tag ? TAG_TEXT[tag] : undefined;
    const common = { submissionId: view.submission.id, source: "rule_based" as const, promptVersion: "fake-1", createdAt: iso() };
    const rubricNotes = ev.rubricChecks.map((c) => ({
      rubricId: c.rubricId,
      verdict: c.status === "ok" ? ("good" as const) : ("suggestion" as const),
      text: c.status === "ok" ? "기준을 잘 지켰습니다." : (c.message ?? "기준을 다시 확인해 보세요."),
    }));
    if (ev.outcome === "compile_error") {
      const d = ev.compileDiagnostics[0];
      return {
        ...common,
        summary: "코드가 컴파일되지 않아 테스트를 실행하지 못했습니다.",
        evidence: d ? [{ text: d.message, ...(d.line ? { line: d.line } : {}) }] : [],
        priorities: ["컴파일 오류 메시지가 가리키는 줄부터 확인하세요."],
        nextAction: "괄호 짝을 맞춘 뒤 실행 버튼으로 공개 테스트를 먼저 돌려 보세요.",
        rubricNotes: [],
      };
    }
    if (ev.correctness) {
      return {
        ...common,
        summary: `모든 테스트(${ev.tests.length}개)를 통과했습니다.`,
        evidence: ev.requirements.filter((r) => r.status === "met").map((r) => ({ text: `${r.id} 충족: ${r.description}` })),
        priorities: rubricNotes.some((n) => n.verdict === "suggestion") ? ["동작은 맞습니다. 코드 품질 제안을 한 가지만 반영해 보세요."] : ["지금 풀이의 핵심 아이디어를 한 문장으로 설명해 보세요."],
        nextAction: "다음 문제에서 같은 개념을 다른 맥락에 적용해 봅니다.",
        rubricNotes,
      };
    }
    return {
      ...common,
      summary: `테스트 ${ev.tests.length}개 중 ${failed.length}개가 실패했습니다.${tagText ? ` ${tagText.what}` : ""}`,
      evidence: failed.map((t) => ({ text: `${t.name}: 기대값과 실제 결과가 다릅니다.`, testId: t.id })),
      priorities: [tagText ? tagText.next : "실패한 테스트의 기대값과 실제값을 나란히 비교해 보세요.", "공개 테스트를 실행 버튼으로 먼저 확인한 뒤 다시 제출하세요."].slice(0, 2),
      nextAction: "코드를 수정하고 재제출하세요. 재제출은 레이팅에 반영되지 않지만 진행 기록에 남습니다.",
      rubricNotes,
    };
  }

  function chatReply(exerciseId: string, code: string | undefined, messages: readonly ChatMessage[]): ChatMessage {
    const fx = find(exerciseId);
    const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    ledger(exerciseId).coachMessages++;
    if (/정답|답\s*코드|풀이\s*코드|전체\s*코드|solution|答案/i.test(last)) {
      return { role: "assistant", content: "정답 코드는 '전체 해설 보기'를 요청하기 전까지 보여 드리지 않습니다. 대신 지금 코드에서 어느 줄이 결과 개수를 바꾸는지 함께 찾아볼까요?" };
    }
    if (/개념|설명|concept|explain|概念|讲解|解释/i.test(last)) {
      const note = CONCEPT_NOTES.find((n) => fx.detail.conceptNoteIds.includes(n.id));
      return { role: "assistant", content: note ? `'${note.title}' 개념이 이 문제의 핵심입니다. map은 원소 개수를 유지하고, filter는 조건에 맞지 않는 원소를 버립니다. 이 문제에서 결과 개수는 어떻게 되어야 할까요?` : "이 문제는 입력의 모양을 유지하면서 값만 바꾸는 연습입니다. 어떤 값이 바뀌고 어떤 값이 그대로여야 하나요?" };
    }
    if (code && /list\.filter/.test(code)) {
      return { role: "assistant", content: "지금 코드는 list.filter로 주문을 거르고 있습니다. 쿠폰이 다른 주문 2번과 3번은 결과에 어떻게 되어야 할까요? 공개 테스트 '쿠폰이 다른 주문은 그대로 유지'의 기대값을 다시 읽어 보세요." };
    }
    if (code && /\btodo\b/.test(code)) {
      return { role: "assistant", content: "아직 todo가 남아 있습니다. 먼저 입력 리스트의 각 주문을 어떤 모양의 결과로 바꿀지 한 줄로 적어 보세요. 막히면 힌트 1단계부터 열어 보는 것도 좋습니다." };
    }
    return { role: "assistant", content: "좋습니다. 실행 버튼으로 공개 테스트를 먼저 확인하고, 통과하면 제출해서 숨은 테스트까지 확인해 보세요." };
  }

  function summaryOf(s: Session): SessionSummary {
    return {
      sessionId: s.id,
      passed: s.items.filter((i) => i.status === "passed").length,
      failed: s.items.filter((i) => i.status === "failed").length,
      fixedAfterFeedback: s.items.filter((i) => i.status === "passed" && i.submissionIds.length > 1).length,
      skillsPracticed: [...new Set(s.items.filter((i) => i.submissionIds.length > 0).map((i) => i.skillId))],
      nextReviews: [...reviews.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).map((r) => ({ skillId: r.skillId, dueAt: r.dueAt })),
    };
  }

  const requireSession = (id: string): Session => {
    if (!session || session.id !== id) throw notFound("세션");
    return session;
  };

  const summaryOfExercise = (fx: FakeExercise): ExerciseSummary => {
    const { promptMarkdown: _p, moduleName: _m, starterFiles: _s, publicTests: _t, hints: _h, rubric: _r, conceptNoteIds: _c, theoryTopicIds: _th, predict: _pr, ...summary } = fx.detail;
    return summary;
  };

  /** Rated observations from checkpoints / placement: one Elo step per item against the level's difficulty. */
  function rateObservations(skillId: string, outcomes: readonly boolean[], difficulty: number): RatingChange {
    const prev = estimates.get(skillId) ?? { skillId: skill(skillId), language: LANG, rating: 1000, deviation: 250, ratedObservations: 0, provisional: true, updatedAt: iso() };
    let rating = prev.rating;
    for (const ok of outcomes) rating += 24 * ((ok ? 1 : 0) - 1 / (1 + 10 ** ((difficulty - rating) / 400)));
    const after = Math.round(rating);
    const obs = prev.ratedObservations + outcomes.length;
    estimates.set(skillId, { ...prev, rating: after, deviation: Math.max(60, Math.round(prev.deviation * 0.8)), ratedObservations: obs, provisional: obs < 5, updatedAt: iso() });
    return { skillId: skill(skillId), before: prev.rating, after, provisional: obs < 5 };
  }

  const api: ApiClient = {
    ...createFakeCourse({ wait: (v) => wait(v), locale, iso: () => iso(), nextId, rate: rateObservations }),
    health: () => wait(() => ({ status: "ok" as const, contentBundle: "fake-bundle", runner: "fake", llm: "none" as const })),
    devLogin: (req) =>
      wait(() => {
        const name = req.displayName.trim();
        if (!name) throw new ApiError(400, { code: "invalid_input", message: "이름을 입력해 주세요." });
        const existing = users.get(name);
        const u: User = existing
          ? { ...existing, ...(req.locale ? { locale: req.locale } : {}) }
          : { id: `user-${encodeURIComponent(name)}` as User["id"], displayName: name, locale: req.locale ?? "ko", createdAt: iso() };
        users.set(name, u);
        user = u;
        const token: IssuedToken = { token: `fake-token-${nextId("t")}`, tokenId: nextId("tok"), label: "web", createdAt: iso() };
        tokens.push({ tokenId: token.tokenId, label: token.label, createdAt: token.createdAt });
        return { user: u, token };
      }),
    me: () => wait(() => user ?? demoUser()),
    updateMe: (req) =>
      wait(() => {
        if (!isLocale(req.locale)) throw new ApiError(400, { code: "invalid_input", message: "지원하지 않는 언어입니다." });
        const u: User = { ...(user ?? demoUser()), locale: req.locale };
        users.set(u.displayName, u);
        user = u;
        return u;
      }),
    issueToken: (req) =>
      wait(() => {
        const t: IssuedToken = { token: `fake-token-${nextId("t")}`, tokenId: nextId("tok"), label: req.label, createdAt: iso() };
        tokens.push({ tokenId: t.tokenId, label: t.label, createdAt: t.createdAt });
        return t;
      }),
    listTokens: () => wait(() => [...tokens]),
    revokeToken: (tokenId) =>
      wait(() => {
        const i = tokens.findIndex((t) => t.tokenId === tokenId);
        if (i >= 0) tokens.splice(i, 1);
        return null;
      }),
    skills: () => wait(() => localizedSkills(locale())),
    exercises: (filter = {}) =>
      wait(() =>
        FAKE_EXERCISES.filter(
          (f) => (!filter.skill || f.detail.primarySkill === filter.skill) && (!filter.kind || f.detail.kind === filter.kind) && (!filter.familyId || f.detail.familyId === filter.familyId),
        ).map(summaryOfExercise),
      ),
    exercise: (exerciseId) =>
      wait(() => {
        const fx = find(exerciseId);
        return {
          exercise: fx.detail,
          conceptNotes: CONCEPT_NOTES.filter((n) => fx.detail.conceptNoteIds.includes(n.id)),
          theoryTopics: THEORY_TOPICS.filter((t) => fx.detail.theoryTopicIds.includes(t.id)),
          revealedHints: revealed(fx),
        };
      }),
    trialRun: (exerciseId, req) =>
      wait((): TrialRun => {
        const ev = evaluate(find(exerciseId), req.code, false);
        return { outcome: ev.outcome, compileDiagnostics: ev.compileDiagnostics, tests: ev.tests, ...(ev.rejectionReasons ? { rejectionReasons: ev.rejectionReasons } : {}) };
      }),
    revealHint: (exerciseId, req) =>
      wait(() => {
        const fx = find(exerciseId);
        const l = ledger(exerciseId);
        const max = fx.detail.hints.length;
        if (req.level < 1 || req.level > max) throw new ApiError(400, { code: "invalid_input", message: "없는 힌트 단계입니다." });
        if (req.level > l.maxHint + 1) throw new ApiError(400, { code: "invalid_input", message: "힌트는 1단계부터 순서대로 열 수 있습니다." });
        l.maxHint = Math.max(l.maxHint, req.level);
        return revealed(fx);
      }),
    noteOpened: (exerciseId, req) =>
      wait(() => {
        find(exerciseId);
        ledger(exerciseId)[req.kind].add(req.noteId);
        return null;
      }),
    explanation: (exerciseId) =>
      wait(() => {
        const fx = find(exerciseId);
        ledger(exerciseId).explanation = true;
        return fx.explanation;
      }),
    theoryTopics: () => wait(() => [...THEORY_TOPICS]),
    submit: (req) =>
      wait(() => {
        const existing = byIdempotency.get(req.idempotencyKey);
        if (existing) return submissions.get(existing)!;
        const fx = find(req.exerciseId);
        const attemptNo = (attempts.get(req.exerciseId) ?? 0) + 1;
        attempts.set(req.exerciseId, attemptNo);
        const ev = evaluate(fx, req.code, true);
        const submission: Submission = {
          id: nextId("sub") as Submission["id"],
          userId: (user?.id ?? "user-demo") as Submission["userId"],
          exerciseId: fx.detail.id,
          ...(req.sessionId ? { sessionId: req.sessionId as NonNullable<Submission["sessionId"]> } : {}),
          attemptNo,
          code: req.code,
          helpUsed: helpUsed(req.exerciseId),
          status: "completed",
          evaluation: ev,
          createdAt: iso(),
        };
        const view: SubmissionView = { submission, ratingChange: rate(fx, submission, ev) };
        submissions.set(submission.id, view);
        byIdempotency.set(req.idempotencyKey, submission.id);
        recordInSession(req.sessionId, req.exerciseId, submission, ev);
        return view;
      }),
    submission: (submissionId) =>
      wait(() => {
        const v = submissions.get(submissionId);
        if (!v) throw notFound("제출");
        return v;
      }),
    feedback: (submissionId) =>
      wait(
        () => {
          const v = submissions.get(submissionId);
          if (!v) throw notFound("제출");
          return feedbackFor(v);
        },
        latency + (opts.feedbackLatencyMs ?? 0),
      ),
    chat: (req) => wait(() => ({ message: chatReply(req.exerciseId, req.code, req.messages), references: [], source: "rule_based" as const })),
    startSession: (req) =>
      wait(() => {
        if (session && session.status === "active") return session;
        const [review, focus, variation] = FAKE_EXERCISES;
        const item = (index: number, kind: SessionItem["kind"], fx: FakeExercise, reason: string): SessionItem => ({
          index,
          kind,
          exerciseId: fx.detail.id,
          skillId: fx.detail.primarySkill,
          reason,
          expectedSuccess: expectedSuccess(fx.detail.primarySkill, fx.detail.difficulty),
          status: index === 0 ? "in_progress" : "pending",
          submissionIds: [],
        });
        session = {
          id: nextId("session") as Session["id"],
          userId: (user?.id ?? "user-demo") as Session["userId"],
          language: req.language,
          status: "active",
          targetMinutes: req.targetMinutes,
          startedAt: iso(),
          items: [
            item(0, "review", review!, "복습 예정: Option과 Result (마지막 시도 실패)"),
            item(1, "focus", focus!, "집중 훈련: 리스트 변환 레이팅 근처 난이도"),
            item(2, "variation", variation!, "변형 적용: 같은 개념을 장바구니 맥락에서"),
          ],
          currentIndex: 0,
        };
        return session;
      }),
    activeSession: () => wait(() => (session && session.status === "active" ? session : null)),
    session: (sessionId) => wait(() => requireSession(sessionId)),
    skipItem: (sessionId) =>
      wait(() => {
        const s = requireSession(sessionId);
        if (s.currentIndex === null) return s;
        const items = [...s.items];
        items[s.currentIndex] = { ...items[s.currentIndex]!, status: "skipped" };
        session = advance(s, items);
        return session;
      }),
    completeSession: (sessionId) =>
      wait(() => {
        const s = requireSession(sessionId);
        session = { ...s, status: "completed", completedAt: iso(), currentIndex: null };
        return summaryOf(session);
      }),
    recommend: () =>
      wait(() => {
        const fx = FAKE_EXERCISES[1]!;
        return { exerciseId: fx.detail.id, skillId: fx.detail.primarySkill, kind: "focus" as const, reason: "레이팅 근처 난이도의 집중 훈련", expectedSuccess: expectedSuccess(fx.detail.primarySkill, fx.detail.difficulty) };
      }),
    progress: (language) =>
      wait((): ProgressView => {
        const list = [...estimates.values()];
        const total = list.reduce((n, e) => n + e.ratedObservations, 0);
        const overall = total === 0 ? null : { rating: Math.round(list.reduce((n, e) => n + e.rating * e.ratedObservations, 0) / total), provisional: total < 20, method: "observation_weighted_mean" as const };
        return {
          profile: {
            userId: (user?.id ?? "user-demo") as ProgressView["profile"]["userId"],
            language,
            estimates: list,
            overall,
            reviews: [...reviews.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
            errorTags: [...errorTags.values()].sort((a, b) => b.count - a.count),
            policyVersion: "elo-fake-1",
          },
          skills: localizedSkills(locale()),
        };
      }),
  };
  return api;
}

/** Line count of the longest top-level `fn` in Gleam source (brace matching, good enough for a fake). */
export function longestFunction(code: string): number {
  const lines = code.split("\n");
  let longest = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*(pub\s+)?fn\s/.test(lines[i]!)) continue;
    let depth = 0;
    let seenBrace = false;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]!) {
        if (ch === "{") {
          depth++;
          seenBrace = true;
        } else if (ch === "}") depth--;
      }
      if (seenBrace && depth <= 0) {
        longest = Math.max(longest, j - i + 1);
        i = j;
        break;
      }
    }
  }
  return longest;
}
