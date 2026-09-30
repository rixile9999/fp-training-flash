/**
 * Sample content for the fake API (VITE_FAKE_API=1). Realistic Korean data built around the
 * "orders-apply-coupon" exercise family. `rules` let the fake simulate grading from the code text.
 */
import type { ConceptNote, ExerciseDetail, Explanation, Skill, TheoryTopic } from "@fp/api-contract";

type SkillId = Skill["id"];
type ExerciseId = ExerciseDetail["id"];

const sk = (s: string) => s as SkillId;
const ex = (s: string) => s as ExerciseId;

export interface FakeTest {
  readonly id: string;
  readonly functionName: string;
  readonly name: string;
  readonly visibility: "public" | "hidden";
  readonly code: string;
  readonly errorTag?: string;
  readonly failMessage: string;
}

/** First rule whose pattern matches the code decides which tests fail ([] = all pass). */
export interface SimRule {
  readonly when: RegExp;
  readonly failing: readonly string[] | "all";
  readonly message?: string;
}

export interface FakeExercise {
  readonly detail: ExerciseDetail;
  readonly tests: readonly FakeTest[];
  readonly requirements: readonly { readonly id: string; readonly description: string; readonly testIds: readonly string[] }[];
  readonly rules: readonly SimRule[];
  readonly explanation: Explanation;
}

export const SKILLS: readonly Skill[] = [
  { id: sk("data-transform"), name: "리스트 변환", description: "map · filter · fold로 데이터를 변환합니다.", track: "core", prerequisites: [], order: 1 },
  { id: sk("pattern-matching"), name: "패턴 매칭", description: "case 식으로 데이터 모양에 따라 분기합니다.", track: "core", prerequisites: [], order: 2 },
  { id: sk("option-result"), name: "Option과 Result", description: "값의 부재와 실패를 타입으로 다룹니다.", track: "core", prerequisites: [sk("pattern-matching")], order: 3 },
  { id: sk("recursion"), name: "재귀", description: "리스트를 재귀로 순회하고 누적합니다.", track: "core", prerequisites: [sk("pattern-matching")], order: 4 },
];

export const CONCEPT_NOTES: readonly ConceptNote[] = [
  {
    id: "gleam/list-map-filter" as ConceptNote["id"],
    language: "gleam",
    title: "list.map과 list.filter",
    markdown:
      "`list.map(xs, f)`는 **원소 개수를 유지**하며 각 원소를 바꿉니다.\n\n`list.filter(xs, p)`는 조건을 만족하는 원소만 **남기고 나머지는 버립니다**.\n\n```gleam\n[1, 2, 3] |> list.map(fn(x) { x * 2 })  // [2, 4, 6]\n[1, 2, 3] |> list.filter(fn(x) { x > 1 }) // [2, 3]\n```",
    source: { kind: "original" },
  },
  {
    id: "gleam/record-update" as ConceptNote["id"],
    language: "gleam",
    title: "레코드 갱신 문법",
    markdown: "`Order(..order, total: 9000)`은 `order`를 복사하면서 `total`만 바꾼 **새 값**을 만듭니다. 원래 값은 변하지 않습니다.",
    source: { kind: "original" },
  },
];

export const THEORY_TOPICS: readonly TheoryTopic[] = [
  {
    id: "theory/functor-map" as TheoryTopic["id"],
    title: "map은 구조를 보존한다",
    level: "basic",
    markdown:
      "`map`은 컨테이너의 **모양(길이, 순서)** 은 그대로 두고 안의 값만 바꿉니다. 이 성질 덕분에 `map`을 쓴 코드는 \"개수가 바뀌지 않는다\"는 것을 읽는 순간 알 수 있습니다.\n\n- `list.map(xs, fn(x) { x }) == xs`\n- `list.map(list.map(xs, f), g) == list.map(xs, fn(x) { g(f(x)) })`",
    relatedSkills: [sk("data-transform")],
    furtherReading: [{ text: "Wadler, P. Theorems for free! (1989)", verified: false }],
  },
];

const COUPON_STARTER = `import gleam/list
import gleam/option.{type Option, None, Some}

pub type Order {
  Order(id: Int, total: Int, coupon: Option(String))
}

/// 쿠폰 코드가 code와 일치하는 주문에만 percent% 할인을 적용합니다.
/// 나머지 주문은 그대로, 순서도 그대로 돌려줍니다.
pub fn apply_coupon(
  orders: List(Order),
  code: String,
  percent: Int,
) -> List(Order) {
  todo
}
`;

const THREE_ORDERS_EXPECTED = `[Order(1, 9000, Some("WELCOME10")), Order(2, 5000, None), Order(3, 8000, Some("SPRING"))]`;

const coupon: FakeExercise = {
  detail: {
    id: ex("orders-apply-coupon/base@1"),
    familyId: "orders-apply-coupon" as ExerciseDetail["familyId"],
    variantKey: "base",
    version: 1,
    language: "gleam",
    kind: "implement",
    format: "drill",
    title: "주문 목록에 쿠폰 적용하기",
    primarySkill: sk("data-transform"),
    secondarySkills: [sk("pattern-matching")],
    difficulty: 1320,
    estimatedMinutes: 6,
    contextTags: ["orders"],
    source: { kind: "original" },
    promptMarkdown:
      "온라인 상점의 주문 목록이 있습니다. 쿠폰 코드가 `code`와 **일치하는 주문의 `total`에만** `percent`% 할인을 적용하세요.\n\n- 쿠폰이 없거나 다른 쿠폰을 쓴 주문은 **그대로 결과에 남아야** 합니다.\n- 결과 리스트의 순서는 입력과 같아야 합니다.\n- 할인 금액은 `total * percent / 100` (정수 나눗셈, 내림)입니다.",
    moduleName: "coupon",
    starterFiles: [{ path: "src/coupon.gleam", content: COUPON_STARTER }],
    publicTests: [
      {
        id: "t1",
        name: "일치하는 쿠폰 주문에 할인 적용",
        code: `pub fn discounts_matching_orders_test() {\n  [Order(1, 10_000, Some("WELCOME10"))]\n  |> coupon.apply_coupon("WELCOME10", 10)\n  |> should.equal([Order(1, 9000, Some("WELCOME10"))])\n}`,
      },
      {
        id: "t2",
        name: "쿠폰이 다른 주문은 그대로 유지",
        code: `pub fn keeps_other_orders_test() {\n  [\n    Order(1, 10_000, Some("WELCOME10")),\n    Order(2, 5000, None),\n    Order(3, 8000, Some("SPRING")),\n  ]\n  |> coupon.apply_coupon("WELCOME10", 10)\n  |> should.equal(${THREE_ORDERS_EXPECTED})\n}`,
      },
    ],
    hints: [
      { level: 1, kind: "question", markdown: "결과 리스트의 길이는 입력 리스트와 같아야 할까요, 달라져도 될까요?" },
      { level: 2, kind: "concept", markdown: "원소 개수를 유지하면서 일부만 바꾸는 변환은 `list.map`, 원소를 걸러내는 변환은 `list.filter`입니다." },
      { level: 3, kind: "approach", markdown: "`list.map` 안에서 `case order.coupon`으로 나누고, `Some(c) if c == code`인 경우에만 할인된 주문을 만드세요." },
      { level: 4, kind: "partial_code", markdown: "```gleam\nlist.map(orders, fn(order) {\n  case order.coupon {\n    Some(c) if c == code -> todo\n    _ -> order\n  }\n})\n```" },
      { level: 5, kind: "explanation", markdown: "할인된 주문은 `Order(..order, total: order.total - order.total * percent / 100)`로 만듭니다." },
    ],
    rubric: [
      { id: "R-01", title: "모든 주문을 유지하는 변환은 map으로", description: "개수를 유지하는 변환임이 코드에서 드러나야 합니다.", automatedCheck: { kind: "require_pattern", pattern: "list\\.map", message: "list.map을 사용하지 않았습니다." } },
      { id: "R-02", title: "분기는 case로 드러내기", description: "쿠폰 일치 여부를 case 식으로 명시합니다.", automatedCheck: { kind: "require_pattern", pattern: "case", message: "case 식이 없습니다." } },
      { id: "R-03", title: "함수 길이 15줄 이하", description: "한 함수는 한 가지 일을 짧게 합니다.", automatedCheck: { kind: "max_function_lines", max: 15 } },
    ],
    conceptNoteIds: CONCEPT_NOTES.map((n) => n.id),
    theoryTopicIds: THEORY_TOPICS.map((t) => t.id),
  },
  tests: [
    { id: "t1", functionName: "discounts_matching_orders_test", name: "일치하는 쿠폰 주문에 할인 적용", visibility: "public", code: "", failMessage: `Values were not equal\nexpected: [Order(1, 9000, Some("WELCOME10"))]\n     got: []` },
    {
      id: "t2",
      functionName: "keeps_other_orders_test",
      name: "쿠폰이 다른 주문은 그대로 유지",
      visibility: "public",
      code: "",
      errorTag: "drops_items_with_filter",
      failMessage: `Values were not equal\nexpected: ${THREE_ORDERS_EXPECTED}\n     got: [Order(1, 9000, Some("WELCOME10"))]`,
    },
    {
      id: "t3",
      functionName: "keeps_order_sequence_test",
      name: "섞인 주문의 순서 유지",
      visibility: "hidden",
      code: `pub fn keeps_order_sequence_test() {\n  [Order(7, 3000, None), Order(8, 4000, Some("A"))]\n  |> coupon.apply_coupon("A", 50)\n  |> should.equal([Order(7, 3000, None), Order(8, 2000, Some("A"))])\n}`,
      errorTag: "drops_items_with_filter",
      failMessage: `Values were not equal\nexpected: [Order(7, 3000, None), Order(8, 2000, Some("A"))]\n     got: [Order(8, 2000, Some("A"))]`,
    },
  ],
  requirements: [
    { id: "REQ-1", description: "쿠폰이 일치하는 주문의 total에 할인을 적용한다", testIds: ["t1"] },
    { id: "REQ-2", description: "쿠폰이 없거나 다른 주문은 변경 없이 유지한다", testIds: ["t2"] },
    { id: "REQ-3", description: "입력 순서를 유지한다", testIds: ["t3"] },
    { id: "REQ-4", description: "주문 리스트를 직접 변경하지 않고 새 리스트를 돌려준다", testIds: [] },
  ],
  rules: [
    { when: /\btodo\b/, failing: "all", message: "todo 식이 실행되었습니다: 아직 구현되지 않았습니다." },
    { when: /list\.filter/, failing: ["t2", "t3"] },
    { when: /list\.map|case/, failing: [] },
  ],
  explanation: {
    exerciseId: ex("orders-apply-coupon/base@1"),
    markdown:
      "모든 주문을 결과에 남겨야 하므로 **개수를 보존하는 `list.map`** 이 맞는 도구입니다. `list.filter`를 쓰면 쿠폰이 다른 주문이 사라집니다.\n\n각 주문은 `case`로 쿠폰 일치 여부를 나누고, 일치할 때만 레코드 갱신 문법으로 새 주문을 만듭니다.",
    solutionCode: `pub fn apply_coupon(orders: List(Order), code: String, percent: Int) -> List(Order) {\n  list.map(orders, fn(order) {\n    case order.coupon {\n      Some(c) if c == code ->\n        Order(..order, total: order.total - order.total * percent / 100)\n      _ -> order\n    }\n  })\n}`,
  },
};

const cartTotal: FakeExercise = {
  detail: {
    ...coupon.detail,
    id: ex("orders-apply-coupon/cart-total@1"),
    variantKey: "cart-total",
    kind: "fix",
    title: "장바구니 합계에 쿠폰 한 번만 적용하기",
    difficulty: 1380,
    estimatedMinutes: 5,
    contextTags: ["cart"],
    promptMarkdown:
      "`cart_total`은 장바구니 합계를 구한 뒤 쿠폰 할인을 **한 번만** 적용해야 합니다. 그런데 지금 코드는 줄마다 할인을 적용해서 내림 오차가 쌓입니다. 버그를 고치세요.",
    moduleName: "cart",
    starterFiles: [
      {
        path: "src/cart.gleam",
        content: `import gleam/list\n\npub type Item {\n  Item(name: String, price: Int, quantity: Int)\n}\n\n/// 합계를 구한 뒤 percent% 할인을 한 번만 적용합니다.\npub fn cart_total(items: List(Item), percent: Int) -> Int {\n  items\n  |> list.fold(0, fn(acc, item) {\n    let line = item.price * item.quantity\n    acc + line - line * percent / 100\n  })\n}\n`,
      },
    ],
    publicTests: [
      {
        id: "v1",
        name: "할인은 합계에 한 번만 적용",
        code: `pub fn rounds_discount_once_test() {\n  [Item("펜", 999, 1), Item("노트", 999, 1)]\n  |> cart.cart_total(10)\n  |> should.equal(1799)\n}`,
      },
    ],
    hints: coupon.detail.hints.slice(0, 2).map((h, i) =>
      i === 0
        ? { ...h, markdown: "999원짜리 두 개에 10%를 줄마다 적용하면 얼마가 되나요? 합계에 한 번 적용하면요?" }
        : { ...h, markdown: "`list.fold`로 합계만 먼저 구하고, 할인은 fold가 끝난 뒤에 계산하세요." },
    ),
    rubric: [coupon.detail.rubric[2]!],
    conceptNoteIds: [],
    theoryTopicIds: [],
  },
  tests: [
    { id: "v1", functionName: "rounds_discount_once_test", name: "할인은 합계에 한 번만 적용", visibility: "public", code: "", errorTag: "discount_per_line", failMessage: "Values were not equal\nexpected: 1799\n     got: 1800" },
  ],
  requirements: [{ id: "REQ-1", description: "할인은 전체 합계에 한 번만 적용한다", testIds: ["v1"] }],
  rules: [
    { when: /\btodo\b/, failing: "all", message: "todo 식이 실행되었습니다." },
    { when: /line \* percent/, failing: ["v1"] },
    { when: /percent/, failing: [] },
  ],
  explanation: {
    exerciseId: ex("orders-apply-coupon/cart-total@1"),
    markdown: "합계를 먼저 `list.fold`로 구하고 할인은 마지막에 한 번 계산합니다. 줄마다 내림하면 오차가 줄 수만큼 쌓입니다.",
    solutionCode: `pub fn cart_total(items: List(Item), percent: Int) -> Int {\n  let total = list.fold(items, 0, fn(acc, item) { acc + item.price * item.quantity })\n  total - total * percent / 100\n}`,
  },
};

const optionPredict: FakeExercise = {
  detail: {
    ...coupon.detail,
    id: ex("option-values/predict@1"),
    familyId: "option-values" as ExerciseDetail["familyId"],
    variantKey: "predict",
    kind: "predict",
    title: "Option 값만 모으기: 결과 예측",
    primarySkill: sk("option-result"),
    secondarySkills: [],
    difficulty: 1150,
    estimatedMinutes: 2,
    contextTags: ["basics"],
    promptMarkdown: "아래 `main()`이 돌려주는 값을 Gleam 표기로 적으세요. 코드를 실행하지 않고 머릿속으로 따라가 보세요.",
    moduleName: "predict",
    starterFiles: [],
    publicTests: [],
    hints: [
      { level: 1, kind: "question", markdown: "`option.values`는 `None`을 어떻게 처리할까요?" },
      { level: 2, kind: "concept", markdown: "`option.values`는 `Some` 안의 값만 꺼내고 `None`은 버립니다." },
    ],
    rubric: [],
    conceptNoteIds: [],
    theoryTopicIds: [],
    predict: {
      code: `import gleam/list\nimport gleam/option.{None, Some}\n\npub fn main() {\n  [Some(3), None, Some(4)]\n  |> option.values\n  |> list.map(fn(x) { x * 10 })\n}`,
      acceptedAnswers: ["[30, 40]", "[30,40]"],
    },
  },
  tests: [{ id: "p1", functionName: "answer", name: "예측한 값 비교", visibility: "public", code: "", failMessage: "expected: [30, 40]" }],
  requirements: [],
  rules: [],
  explanation: {
    exerciseId: ex("option-values/predict@1"),
    markdown: "`option.values`가 `[3, 4]`를 만들고, `list.map`이 각 값에 10을 곱해 `[30, 40]`이 됩니다.",
    solutionCode: "[30, 40]",
  },
};

export const FAKE_EXERCISES: readonly FakeExercise[] = [optionPredict, coupon, cartTotal];
