/**
 * Fake recall routes (docs/design/recall.md): three Korean cards (two syntax, list.fold), answers checked here.
 * Produce is correct when the body is non-empty and contains every mustUse token. `minutes` is ignored.
 */
import { ApiError } from "@fp/api-contract";
import type { ApiClient, Locale, RecallAnswerResult, RecallCard, RecallCardState, RecallResponse, RecallSessionView, RecallSummary } from "@fp/api-contract";
import { pickLocale } from "../i18n/locale.ts";
import type { LocalizedText } from "../i18n/locale.ts";
import type { DeckProgress, RecallItem, RecallStage } from "./types.ts";

type RecallApi = Pick<ApiClient, "recallOverview" | "startRecall" | "recallAnswer" | "finishRecall" | "recallDeckCards">;
type Key = {
  readonly answer: number;
  readonly choiceFeedback: Readonly<Record<number, string>>;
  readonly correct: string;
  readonly cloze: readonly string[];
  readonly clozeExpected: string;
  readonly predict?: string;
  readonly produce: { readonly expected: string; readonly mustUse: readonly string[]; readonly reference: string };
};

const DECKS: readonly { id: string; title: LocalizedText }[] = [
  { id: "syntax", title: { ko: "문법", en: "Syntax", zh: "语法" } },
  { id: "stdlib", title: { ko: "핵심 라이브러리", en: "Core library", zh: "核心库" } },
  { id: "pitfalls", title: { ko: "함정", en: "Pitfalls", zh: "陷阱" } },
];

const card = (c: Omit<RecallCard, "locales" | "imports" | "example"> & { example: string; imports?: string[] }): RecallCard => ({ imports: [], locales: ["ko"], ...c });

export const FAKE_RECALL: readonly (readonly [RecallCard, Key])[] = [
  [
    card({
      id: "syntax-block-value", deckId: "syntax", title: "블록의 값", topic: "blocks",
      summary: "블록 `{ ... }`은 식입니다. 마지막 식의 값이 블록 전체의 값이 됩니다.",
      example: "{\n  let x = 2\n  x * 3\n}  // -> 6",
      recognize: { prompt: "블록 `{ ... }`의 값은?", choices: ["마지막 식의 값", "첫 식의 값", "항상 `Nil`", "`return`으로 지정한 값"] },
      cloze: { prompt: "빈칸을 채워 x를 묶으세요.", code: "{\n  ____ x = 2\n  x * 3\n}" },
      predict: { prompt: "이 식의 값은?", code: "{\n  let x = 2\n  let x = x + 1\n  x * 10\n}" },
      produce: { prompt: "`let`으로 합을 묶고 두 수의 평균(내림)을 돌려주세요.", header: "pub fn average(a: Int, b: Int) -> Int", hint: "`let sum = a + b` 다음 줄에 결과 식을 쓰세요." },
    }),
    { answer: 0, correct: "맞아요. 마지막 식이 블록의 값입니다.", choiceFeedback: { 1: "첫 식은 버려집니다.", 2: "블록은 마지막 식의 값을 가집니다.", 3: "Gleam에는 `return`이 없습니다." }, cloze: ["let"], clozeExpected: "6", predict: "30", produce: { expected: "#(3, 1)", mustUse: ["let"], reference: "let sum = a + b\nsum / 2" } },
  ],
  [
    card({
      id: "syntax-case-catch-all", deckId: "syntax", title: "case와 _", topic: "case",
      summary: "`case`는 위에서부터 패턴을 맞춰 보고 처음 맞은 분기의 값을 돌려줍니다. `_`는 나머지 모두와 맞습니다.",
      example: 'case 3 {\n  0 -> "zero"\n  _ -> "many"\n}  // -> "many"',
      recognize: { prompt: "`case`에서 나머지 모든 값과 맞는 패턴은?", choices: ["`_`", "`else`", "`default`", "`*`"] },
      cloze: { prompt: "빈칸을 채워 나머지 경우를 받으세요.", code: 'case 5 {\n  0 -> "zero"\n  ____ -> "other"\n}' },
      produce: { prompt: '음수면 "-", 0이면 "0", 양수면 "+"를 돌려주세요.', header: "pub fn sign(n: Int) -> String" },
    }),
    { answer: 0, correct: "맞아요. `_`는 무엇과도 맞고 값을 버립니다.", choiceFeedback: { 1: "`else`는 Gleam 키워드가 아닙니다.", 2: "`default`는 다른 언어의 switch 문법입니다.", 3: "`*`는 패턴이 아닙니다." }, cloze: ["_", "n", "_n"], clozeExpected: '"other"', produce: { expected: '#("-", "0", "+")', mustUse: ["case"], reference: 'case n {\n  0 -> "0"\n  _ if n < 0 -> "-"\n  _ -> "+"\n}' } },
  ],
  [
    card({
      id: "list-fold", deckId: "stdlib", title: "list.fold", topic: "gleam/list", imports: ["gleam/list"], frequency: 39,
      summary: "리스트를 왼쪽부터 하나씩 접어 값 하나로 만듭니다. 콜백은 누적값이 먼저, 원소가 나중입니다.",
      example: "list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6",
      signature: "list.fold(List(a), from: b, with: fn(b, a) -> b) -> b",
      recognize: { prompt: "`list.fold`의 콜백 `fn(?, ?)`에 들어오는 인자 순서는?", choices: ["`fn(원소, 누적값)`", "`fn(누적값, 원소)`", "`fn(인덱스, 원소)`", "`fn(원소)`"] },
      cloze: { prompt: "빈칸을 채워 리스트의 합을 구하세요.", code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })" },
      predict: { prompt: "이 식의 값은?", code: "list.fold([1, 2, 3], 0, fn(acc, x) { acc - x })" },
      produce: { prompt: "정수 리스트의 합을 돌려주는 함수 본문을 `list.fold`로 쓰세요.", header: "pub fn total(xs: List(Int)) -> Int", hint: "시작값은 0이고, 콜백은 `fn(acc, x) { ... }` 모양입니다." },
    }),
    { answer: 1, correct: "맞아요. `fn(acc, x)`처럼 누적값이 먼저 옵니다.", choiceFeedback: { 0: "반대예요. Gleam의 `list.fold` 콜백은 누적값을 먼저 받습니다.", 2: "인덱스를 함께 받는 것은 `list.index_fold`입니다.", 3: "fold는 누적값을 이어 받아야 하므로 인자가 두 개입니다." }, cloze: ["fold"], clozeExpected: "6", predict: "-6", produce: { expected: "#(6, 0, 5)", mustUse: ["list.fold"], reference: "list.fold(xs, 0, fn(acc, x) { acc + x })" } },
  ],
];

const STAGES: readonly RecallStage[] = ["recognize", "cloze", "produce"];
const MIN = 60_000;
const DAY = 86_400_000;
const NEW_PER_DAY = 10;
const notFound = (message: string) => new ApiError(404, { code: "not_found", message });

export function createFakeRecall(deps: { readonly wait: <T>(value: () => T) => Promise<T>; readonly locale: () => Locale; readonly now: () => number; readonly nextId: (p: string) => string }): RecallApi {
  const { wait, now } = deps;
  const iso = (ms: number) => new Date(ms).toISOString();
  const states = new Map<string, RecallCardState>([["syntax-block-value", { stage: "cloze", reps: 2, lapses: 0, dueAt: iso(now() - 2 * 60 * MIN), stabilityDays: 2 }]]);
  const sessions = new Map<string, { view: RecallSessionView; results: Map<string, RecallAnswerResult> }>();
  let newToday = 0;

  const mastered = (s: RecallCardState | undefined) => s?.stage === "produce" && (s.stabilityDays ?? 0) >= 21;
  const isDue = (s: RecallCardState | undefined, at = now()) => !!s?.dueAt && Date.parse(s.dueAt) <= at;
  const decks = (): DeckProgress[] =>
    DECKS.map((d) => {
      const cs = FAKE_RECALL.filter(([c]) => c.deckId === d.id).map(([c]) => states.get(c.id));
      return { deckId: d.id, title: pickLocale(d.title, deps.locale()), total: cs.length, seen: cs.filter(Boolean).length, mastered: cs.filter(mastered).length, due: cs.filter((s) => isDue(s)).length };
    });
  const session = (id: string) => {
    const s = sessions.get(id);
    if (!s) throw notFound("암기 세션을 찾을 수 없습니다.");
    return s;
  };

  function grade(k: Key, form: RecallItem["form"], r: RecallResponse) {
    const text = r.kind === "text" ? r.text.trim() : "";
    if (form === "recognize") {
      const ok = r.kind === "choice" && r.choice === k.answer;
      return { correct: ok, feedback: ok ? k.correct : (k.choiceFeedback[r.kind === "choice" ? r.choice : -1] ?? "") };
    }
    if (form === "cloze") {
      const ok = k.cloze.includes(text);
      return { correct: ok, feedback: ok ? "맞아요." : `정답: \`${k.cloze[0]}\``, expected: k.clozeExpected, ...(ok ? { actual: k.clozeExpected } : {}) };
    }
    if (form === "predict") {
      const ok = text === k.predict;
      return { correct: ok, feedback: ok ? "맞아요." : "값이 달라요. 한 단계씩 계산해 보세요.", expected: k.predict!, actual: text };
    }
    const body = r.kind === "code" ? r.body.trim() : "";
    const missing = k.produce.mustUse.filter((tok) => !body.includes(tok));
    const ok = body !== "" && missing.length === 0;
    return {
      correct: ok,
      feedback: ok ? "맞아요. 모든 검사를 통과했어요." : "아직 아니에요. 모범 답안과 비교해 보세요.",
      expected: k.produce.expected,
      ...(ok ? { actual: k.produce.expected } : { reference: k.produce.reference }),
      ...(body === "" ? { diagnostics: ["함수 본문이 비어 있습니다."] } : {}),
      ...(missing.length ? { missing } : {}),
    };
  }

  return {
    recallOverview: () =>
      wait(() => {
        const unseen = FAKE_RECALL.filter(([c]) => !states.has(c.id)).length;
        return { decks: decks(), dueNow: [...states.values()].filter((s) => isDue(s)).length, newAvailableToday: Math.min(unseen, NEW_PER_DAY - newToday), newPerDay: NEW_PER_DAY };
      }),
    startRecall: (req = {}) =>
      wait(() => {
        const pool = FAKE_RECALL.filter(([c]) => !req.deckIds?.length || req.deckIds.includes(c.deckId)).map(([c]) => c);
        const due = pool.filter((c) => isDue(states.get(c.id)));
        const fresh = pool.filter((c) => !states.has(c.id)).slice(0, Math.max(0, NEW_PER_DAY - newToday));
        if (!due.length && !fresh.length) throw new ApiError(409, { code: "conflict", message: "지금 복습하거나 새로 배울 카드가 없습니다." });
        const item = (kind: RecallItem["kind"], form: RecallItem["form"], c: RecallCard): RecallItem => ({ itemId: deps.nextId("ri"), kind, form, card: c });
        const last = [...due, ...fresh].at(-1)!;
        const items = [
          ...due.map((c) => item("review", states.get(c.id)!.stage, c)),
          ...fresh.map((c) => item("new", "recognize", c)),
          ...fresh.map((c, i) => item("mix", i % 2 && c.predict ? "predict" : "cloze", c)),
          item("finale", "produce", last),
        ];
        const view = { sessionId: deps.nextId("rs"), items, startedAt: iso(now()) };
        sessions.set(view.sessionId, { view, results: new Map() });
        return view;
      }),
    recallAnswer: (sessionId, req) =>
      wait(() => {
        const s = session(sessionId);
        const done = s.results.get(req.itemId);
        if (done) return done;
        const it = s.view.items.find((i) => i.itemId === req.itemId);
        if (!it) throw notFound("문항을 찾을 수 없습니다.");
        const [c, k] = FAKE_RECALL.find(([x]) => x.id === it.card.id)!;
        const graded = grade(k, it.form, req.response);
        const g = it.form === "recognize" ? { ...graded, expected: c.recognize.choices[k.answer] } : graded;
        const prev = states.get(c.id) ?? { stage: "recognize" as const, reps: 0, lapses: 0 };
        if (it.kind === "new" && !states.has(c.id)) newToday++;
        const at = STAGES.indexOf(prev.stage);
        const formAt = STAGES.indexOf(it.form === "predict" ? "cloze" : it.form);
        const rating = !g.correct ? "again" : req.elapsedMs > 30_000 ? "hard" : req.elapsedMs < 8_000 && formAt >= 1 ? "easy" : "good";
        const days = { again: 0, hard: 1, good: 2, easy: 4 }[rating] * (prev.reps + 1);
        const stage = g.correct ? STAGES[Math.min(2, Math.max(at, formAt + 1))]! : STAGES[Math.max(0, at - 1)]!;
        const dueAt = iso(now() + (g.correct ? days * DAY : 10 * MIN));
        states.set(c.id, { stage, reps: prev.reps + 1, lapses: prev.lapses + (g.correct ? 0 : 1), dueAt, stabilityDays: Math.max(days, 0.01) });
        const result: RecallAnswerResult = { ...g, rating, stage, nextDueAt: dueAt };
        s.results.set(req.itemId, result);
        return result;
      }),
    finishRecall: (sessionId) =>
      wait((): RecallSummary => {
        const s = session(sessionId);
        const answered = s.view.items.filter((i) => s.results.has(i.itemId));
        const tomorrow = new Date(now() + DAY).setHours(23, 59, 59, 999);
        return {
          sessionId,
          answered: answered.length,
          correct: answered.filter((i) => s.results.get(i.itemId)!.correct).length,
          newLearned: new Set(answered.filter((i) => i.kind === "new").map((i) => i.card.id)).size,
          dueTomorrow: [...states.values()].filter((st) => isDue(st, tomorrow)).length,
          decks: decks(),
        };
      }),
    recallDeckCards: (deckId) =>
      wait(() => {
        if (!DECKS.some((d) => d.id === deckId)) throw notFound("덱을 찾을 수 없습니다.");
        return FAKE_RECALL.filter(([c]) => c.deckId === deckId).map(([c]) => ({ ...c, state: states.get(c.id) ?? null }));
      }),
  };
}
