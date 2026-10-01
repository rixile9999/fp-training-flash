/**
 * GENERATED, do not edit. Sample course data for the fake API (VITE_FAKE_API=1), converted from content/lessons:
 * every unit's titles and lesson titles, and the full lessons (blocks, answers, per-choice feedback) of
 * u01-values and u02-functions-pipes, in ko with the en/zh overlays applied.
 */
import type { LocalizedText as LT } from "../../i18n/locale.ts";

export interface FakeLessonUnit {
  readonly id: string;
  readonly order: number;
  readonly level: number;
  readonly skill: string;
  readonly prerequisites: readonly string[];
  readonly lessonIds: readonly string[];
  readonly title: LT;
  readonly lessonTitles: readonly LT[];
}
export interface FakeExercise {
  readonly kind: "exercise";
  readonly id: string;
  readonly type: "choice" | "predict";
  readonly prompt: LT;
  readonly code?: LT;
  readonly choices: readonly LT[];
  readonly answer: number;
  readonly correct: LT;
  /** Wrong choice index -> explanation. */
  readonly feedback: Readonly<Record<string, LT>>;
}
export interface FakeLesson {
  readonly unitId: string;
  readonly id: string;
  readonly title: LT;
  readonly tags: readonly string[];
  readonly blocks: readonly ({ readonly kind: "prose"; readonly id: string; readonly markdown: LT } | FakeExercise)[];
}

export const FAKE_UNITS: readonly FakeLessonUnit[] = [
 {
  "id": "u01-values",
  "order": 1,
  "level": 1,
  "skill": "gleam-basics",
  "prerequisites": [],
  "lessonIds": [
   "l01-values-let",
   "l02-immutability",
   "l03-int-float",
   "l04-expressions",
   "l05-string-bool"
  ],
  "title": {
   "ko": "값, 불변성, 표현식",
   "en": "Values, Immutability, Expressions",
   "zh": "值、不可变性与表达式"
  },
  "lessonTitles": [
   {
    "ko": "값과 let",
    "en": "Values and let",
    "zh": "值与 let"
   },
   {
    "ko": "불변성과 shadowing",
    "en": "Immutability and shadowing",
    "zh": "不可变性与 shadowing"
   },
   {
    "ko": "Int와 Float는 남남",
    "en": "Int and Float are strangers",
    "zh": "Int 和 Float 互不相干"
   },
   {
    "ko": "모든 것이 표현식",
    "en": "Everything is an expression",
    "zh": "一切皆表达式"
   },
   {
    "ko": "String과 Bool, 그리고 echo/io.println",
    "en": "String and Bool, plus echo/io.println",
    "zh": "String 与 Bool，以及 echo/io.println"
   }
  ]
 },
 {
  "id": "u02-functions-pipes",
  "order": 2,
  "level": 1,
  "skill": "gleam-basics",
  "prerequisites": [
   "u01-values"
  ],
  "lessonIds": [
   "l05-fn-def",
   "l06-pipe",
   "l07-nested-to-pipe",
   "l08-pipe-first"
  ],
  "title": {
   "ko": "함수와 파이프",
   "en": "Functions and Pipes",
   "zh": "函数与管道"
  },
  "lessonTitles": [
   {
    "ko": "함수 정의와 타입 표기",
    "en": "Function Definitions and Type Annotations",
    "zh": "函数定义与类型标注"
   },
   {
    "ko": "파이프 |>",
    "en": "The Pipe |>",
    "zh": "管道 |>"
   },
   {
    "ko": "중첩 호출을 파이프로",
    "en": "Turning Nested Calls into Pipes",
    "zh": "把嵌套调用改写成管道"
   },
   {
    "ko": "파이프 우선 스타일과 한계",
    "en": "Pipe-First Style and Its Limits",
    "zh": "管道优先风格及其局限"
   }
  ]
 },
 {
  "id": "u03-case-branching",
  "order": 3,
  "level": 1,
  "skill": "gleam-basics",
  "prerequisites": [
   "u02-functions-pipes"
  ],
  "lessonIds": [
   "l05-case-anatomy",
   "l06-guards-alternates",
   "l07-no-early-return",
   "l08-imperative-to-expr"
  ],
  "title": {
   "ko": "case와 분기",
   "en": "case and Branching",
   "zh": "case 与分支"
  },
  "lessonTitles": [
   {
    "ko": "case 표현식 해부",
    "en": "Anatomy of a case Expression",
    "zh": "剖析 case 表达式"
   },
   {
    "ko": "guard와 _, 대안 패턴",
    "en": "Guards, _, and Alternate Patterns",
    "zh": "守卫、_ 与多选模式"
   },
   {
    "ko": "early return은 없다",
    "en": "There Is No early return",
    "zh": "没有提前返回"
   },
   {
    "ko": "명령형을 표현식으로",
    "en": "From Imperative to Expression",
    "zh": "从命令式到表达式"
   }
  ]
 },
 {
  "id": "u04-custom-types",
  "order": 4,
  "level": 2,
  "skill": "gleam-types",
  "prerequisites": [
   "u03-case-branching"
  ],
  "lessonIds": [
   "l09-variants",
   "l10-records-labelled",
   "l11-exhaustiveness",
   "l12-record-update",
   "l13-bool-vs-custom"
  ],
  "title": {
   "ko": "커스텀 타입과 레코드",
   "en": "Custom Types and Records",
   "zh": "自定义类型与记录"
  },
  "lessonTitles": [
   {
    "ko": "variant로 상태 표현하기",
    "en": "Modeling state with variants",
    "zh": "用变体（variant）表示状态"
   },
   {
    "ko": "record와 labelled fields",
    "en": "Records and labelled fields",
    "zh": "记录（record）与带标签字段"
   },
   {
    "ko": "빠짐없이 다루기 — exhaustiveness",
    "en": "Handling everything — exhaustiveness",
    "zh": "一个都不漏——穷尽性（exhaustiveness）"
   },
   {
    "ko": "record update — '수정'의 정체",
    "en": "Record update — what 'modifying' really is",
    "zh": "记录更新——“修改”的真相"
   },
   {
    "ko": "Bool 대신 커스텀 타입",
    "en": "Custom types instead of Bool",
    "zh": "用自定义类型代替 Bool"
   }
  ]
 },
 {
  "id": "u05-lists-recursion",
  "order": 5,
  "level": 2,
  "skill": "gleam-lists-recursion",
  "prerequisites": [
   "u04-custom-types"
  ],
  "lessonIds": [
   "l05-list-prepend",
   "l05-head-tail-pattern",
   "l05-first-recursion",
   "l05-termination",
   "l05-no-loops"
  ],
  "title": {
   "ko": "리스트와 재귀",
   "en": "Lists and Recursion",
   "zh": "列表与递归"
  },
  "lessonTitles": [
   {
    "ko": "List(a)와 prepend",
    "en": "List(a) and prepend",
    "zh": "List(a) 与 prepend"
   },
   {
    "ko": "[first, ..rest] — 리스트를 분해하는 패턴",
    "en": "[first, ..rest] — the pattern that takes a list apart",
    "zh": "[first, ..rest]——拆分列表的模式"
   },
   {
    "ko": "첫 재귀: 길이 세기와 합",
    "en": "First recursion: counting length and summing",
    "zh": "第一个递归：计算长度与求和"
   },
   {
    "ko": "종료 조건 — 재귀의 생명줄",
    "en": "The base case — recursion's lifeline",
    "zh": "终止条件——递归的生命线"
   },
   {
    "ko": "인덱스 없는 세계 — no loops",
    "en": "A world without indices — no loops",
    "zh": "没有索引的世界——没有循环"
   }
  ]
 },
 {
  "id": "u06-tail-recursion",
  "order": 6,
  "level": 2,
  "skill": "gleam-lists-recursion",
  "prerequisites": [
   "u05-lists-recursion"
  ],
  "lessonIds": [
   "l15-stack-growth",
   "l16-accumulator",
   "l17-wrapper-loop",
   "l18-acc-reverse"
  ],
  "title": {
   "ko": "꼬리 재귀와 누산기",
   "en": "Tail Recursion and Accumulators",
   "zh": "尾递归与累加器"
  },
  "lessonTitles": [
   {
    "ko": "스택이 자라는 재귀, 자라지 않는 재귀",
    "en": "Recursion That Grows the Stack, and Recursion That Doesn't",
    "zh": "栈会增长的递归与栈不会增长的递归"
   },
   {
    "ko": "accumulator 패턴",
    "en": "The Accumulator Pattern",
    "zh": "累加器（accumulator）模式"
   },
   {
    "ko": "wrapper + private loop 관용구",
    "en": "The Wrapper + Private Loop Idiom",
    "zh": "wrapper + 私有 loop 惯用法"
   },
   {
    "ko": "누산의 부작용: 뒤집힌 결과",
    "en": "A Side Effect of Accumulation: the Reversed Result",
    "zh": "累加的代价：结果被反转"
   }
  ]
 },
 {
  "id": "u07-functions-as-values",
  "order": 7,
  "level": 2,
  "skill": "gleam-lists-recursion",
  "prerequisites": [
   "u05-lists-recursion"
  ],
  "lessonIds": [
   "u07-l01-anonymous-functions",
   "u07-l02-higher-order",
   "u07-l03-captures",
   "u07-l04-labelled-args"
  ],
  "title": {
   "ko": "함수를 값으로",
   "en": "Functions as Values",
   "zh": "函数作为值"
  },
  "lessonTitles": [
   {
    "ko": "익명 함수와 함수 값",
    "en": "Anonymous Functions and Function Values",
    "zh": "匿名函数与函数值"
   },
   {
    "ko": "고차 함수 — 함수를 받는 함수",
    "en": "Higher-Order Functions — Functions That Take Functions",
    "zh": "高阶函数——接收函数的函数"
   },
   {
    "ko": "함수 캡처 f(_, x)",
    "en": "Function Captures f(_, x)",
    "zh": "函数捕获 f(_, x)"
   },
   {
    "ko": "labelled arguments",
    "en": "labelled arguments",
    "zh": "带标签参数"
   }
  ]
 },
 {
  "id": "u08-list-module",
  "order": 8,
  "level": 3,
  "skill": "gleam-lists-recursion",
  "prerequisites": [
   "u06-tail-recursion",
   "u07-functions-as-values"
  ],
  "lessonIds": [
   "l08-list-map",
   "l08-list-filter",
   "l08-fold",
   "l08-fold-direction",
   "l08-tool-choice"
  ],
  "title": {
   "ko": "list 모듈 — 재귀의 추상화",
   "en": "The list Module — Abstracting Recursion",
   "zh": "list 模块——把递归抽象出来"
  },
  "lessonTitles": [
   {
    "ko": "당신이 쓴 재귀에는 이름이 있다 — map",
    "en": "The Recursion You Wrote Has a Name — map",
    "zh": "你写过的递归有名字——map"
   },
   {
    "ko": "filter — 골라내기",
    "en": "filter — Picking Things Out",
    "zh": "filter——挑选元素"
   },
   {
    "ko": "fold — 만능 접기",
    "en": "fold — The All-Purpose Fold",
    "zh": "fold——万能的折叠"
   },
   {
    "ko": "fold 방향과 누산기",
    "en": "Fold Direction and the Accumulator",
    "zh": "fold 的方向与累加器"
   },
   {
    "ko": "도구 선택 — map인가 filter인가 fold인가",
    "en": "Choosing the Tool — map, filter, or fold",
    "zh": "选择工具——map、filter 还是 fold"
   }
  ]
 },
 {
  "id": "u09-option-result",
  "order": 9,
  "level": 3,
  "skill": "explicit-failure",
  "prerequisites": [
   "u04-custom-types"
  ],
  "lessonIds": [
   "l01-option",
   "l02-result",
   "l03-custom-error",
   "l04-option-vs-result",
   "l05-stdlib-results"
  ],
  "title": {
   "ko": "Option과 Result",
   "en": "Option and Result",
   "zh": "Option 与 Result"
  },
  "lessonTitles": [
   {
    "ko": "없을 수도 있는 값 — Option",
    "en": "Values That Might Not Exist — Option",
    "zh": "可能不存在的值——Option"
   },
   {
    "ko": "실패할 수 있는 연산 — Result",
    "en": "Operations That Can Fail — Result",
    "zh": "可能失败的运算——Result"
   },
   {
    "ko": "나만의 에러 타입",
    "en": "Your Own Error Types",
    "zh": "自定义错误类型"
   },
   {
    "ko": "Option vs Result 선택 기준",
    "en": "How to Choose Between Option and Result",
    "zh": "Option 与 Result 的选择标准"
   },
   {
    "ko": "stdlib의 Result들",
    "en": "Results in the stdlib",
    "zh": "标准库中的 Result"
   }
  ]
 },
 {
  "id": "u10-result-use",
  "order": 10,
  "level": 3,
  "skill": "explicit-failure",
  "prerequisites": [
   "u08-list-module",
   "u09-option-result"
  ],
  "lessonIds": [
   "l30-case-stairs",
   "l31-map-try",
   "l32-use-sugar",
   "l33-use-desugar"
  ],
  "title": {
   "ko": "Result 체이닝과 use",
   "en": "Result Chaining and use",
   "zh": "Result 链式调用与 use"
  },
  "lessonTitles": [
   {
    "ko": "case 계단의 고통",
    "en": "The Pain of the case Staircase",
    "zh": "case 阶梯之痛"
   },
   {
    "ko": "result.map과 result.try",
    "en": "result.map and result.try",
    "zh": "result.map 与 result.try"
   },
   {
    "ko": "use — 계단을 펴는 설탕",
    "en": "use — Sugar that Flattens the Staircase",
    "zh": "use——铺平阶梯的语法糖"
   },
   {
    "ko": "use의 정체 — 디슈가링과 한계",
    "en": "What use Really Is — Desugaring and Its Limits",
    "zh": "use 的真面目——脱糖与局限"
   }
  ]
 },
 {
  "id": "u11-generics",
  "order": 11,
  "level": 3,
  "skill": "gleam-types",
  "prerequisites": [
   "u08-list-module",
   "u09-option-result"
  ],
  "lessonIds": [
   "l40-type-variables",
   "l41-generic-types",
   "l42-alias-tuple-custom",
   "l43-dicts-sets"
  ],
  "title": {
   "ko": "제네릭과 타입 설계 기초",
   "en": "Generics and Type Design Basics",
   "zh": "泛型与类型设计基础"
  },
  "lessonTitles": [
   {
    "ko": "타입 변수 — 아무거나 한 가지",
    "en": "Type Variables — Any One Thing",
    "zh": "类型变量——任意的某一种"
   },
   {
    "ko": "제네릭 커스텀 타입",
    "en": "Generic Custom Types",
    "zh": "泛型自定义类型"
   },
   {
    "ko": "type alias, 그리고 tuple vs 커스텀 타입",
    "en": "type alias, and tuple vs custom type",
    "zh": "type alias，以及元组与自定义类型"
   },
   {
    "ko": "Dict와 Set 한 바퀴",
    "en": "A Tour of Dict and Set",
    "zh": "Dict 与 Set 速览"
   }
  ]
 },
 {
  "id": "u12-opaque-types",
  "order": 12,
  "level": 4,
  "skill": "gleam-types",
  "prerequisites": [
   "u10-result-use",
   "u11-generics"
  ],
  "lessonIds": [
   "l36-opaque-smart-ctor",
   "l37-invariant-boundary",
   "l38-make-invalid-unrep",
   "l39-phantom-types"
  ],
  "title": {
   "ko": "Opaque Type과 API 설계",
   "en": "Opaque Types and API Design",
   "zh": "不透明类型与 API 设计"
  },
  "lessonTitles": [
   {
    "ko": "잘못된 값을 만들 수 없게 — opaque + smart constructor",
    "en": "Make invalid values impossible to build — opaque + smart constructor",
    "zh": "让错误的值无法构造——opaque + 智能构造器"
   },
   {
    "ko": "불변식은 모듈 경계에서 지킨다",
    "en": "Enforce invariants at the module boundary",
    "zh": "在模块边界守住不变式"
   },
   {
    "ko": "make invalid states unrepresentable",
    "en": "make invalid states unrepresentable",
    "zh": "让非法状态无法表示（make invalid states unrepresentable）"
   },
   {
    "ko": "phantom types 맛보기",
    "en": "a taste of phantom types",
    "zh": "初探 phantom type（幻影类型）"
   }
  ]
 },
 {
  "id": "u13-intentional-crash",
  "order": 13,
  "level": 4,
  "skill": "gleam-basics",
  "prerequisites": [
   "u09-option-result"
  ],
  "lessonIds": [
   "l13a-todo-panic",
   "l13b-let-assert",
   "l13c-assert-test"
  ],
  "title": {
   "ko": "의도적 크래시",
   "en": "Intentional Crashes",
   "zh": "故意崩溃"
  },
  "lessonTitles": [
   {
    "ko": "todo와 panic — 아직 vs 절대",
    "en": "todo and panic — not yet vs never",
    "zh": "todo 与 panic——“还没做”与“绝不该到”"
   },
   {
    "ko": "let assert — \"이건 반드시 맞는다\"",
    "en": "let assert — \"this is guaranteed to match\"",
    "zh": "let assert——“这里一定匹配”"
   },
   {
    "ko": "assert와 테스트 — 크래시가 옳은 순간",
    "en": "assert and testing — when crashing is the right call",
    "zh": "assert 与测试——崩溃才是正确选择的时刻"
   }
  ]
 },
 {
  "id": "u14-gleam-omits",
  "order": 14,
  "level": 4,
  "skill": "gleam-basics",
  "prerequisites": [
   "u10-result-use",
   "u11-generics"
  ],
  "lessonIds": [
   "l14-no-typeclass",
   "l14-no-currying",
   "l14-eager",
   "l14-no-exceptions"
  ],
  "title": {
   "ko": "Gleam에 없는 것들 — 사고 전환 II",
   "en": "What Gleam Leaves Out — Mindset Shift II",
   "zh": "Gleam 没有的东西——思维转换 II"
  },
  "lessonTitles": [
   {
    "ko": "타입 클래스가 없는 이유",
    "en": "Why There Are No Type Classes",
    "zh": "为什么没有类型类"
   },
   {
    "ko": "커링이 없는 이유와 캡처",
    "en": "Why There's No Currying, and Capture",
    "zh": "为什么没有柯里化，以及捕获"
   },
   {
    "ko": "게으름이 없다 — eager 평가",
    "en": "No Laziness — Eager Evaluation",
    "zh": "没有惰性——及早求值"
   },
   {
    "ko": "예외·뮤테이션·매크로 — 결핍의 일관성",
    "en": "Exceptions, Mutation, Macros — The Consistency of Absence",
    "zh": "异常、可变状态、宏——“没有”的一致性"
   }
  ]
 },
 {
  "id": "u15-capstone",
  "order": 15,
  "level": 4,
  "skill": "gleam-basics",
  "prerequisites": [
   "u12-opaque-types",
   "u13-intentional-crash",
   "u14-gleam-omits"
  ],
  "lessonIds": [
   "l15-csv-parser",
   "l15-state-machine",
   "l15-otp-actor",
   "l15-next-steps"
  ],
  "title": {
   "ko": "캡스톤",
   "en": "Capstone",
   "zh": "综合实战"
  },
  "lessonTitles": [
   {
    "ko": "종합 1 — CSV 한 줄 파서",
    "en": "Capstone 1 — A One-Line CSV Parser",
    "zh": "综合实战 1——单行 CSV 解析器"
   },
   {
    "ko": "종합 2 — 상태 기계",
    "en": "Capstone 2 — A State Machine",
    "zh": "综合实战 2——状态机"
   },
   {
    "ko": "OTP와 actor — 다음 세계 (읽기 전용)",
    "en": "OTP and Actors — The Next World (Read-Only)",
    "zh": "OTP 与 actor——下一个世界（只读）"
   },
   {
    "ko": "수료와 다음 경로",
    "en": "Completion and Next Paths",
    "zh": "结业与下一步路径"
   }
  ]
 }
];

export const FAKE_LESSONS: readonly FakeLesson[] = [
 {
  "unitId": "u01-values",
  "id": "l01-values-let",
  "title": {
   "ko": "값과 let",
   "en": "Values and let",
   "zh": "值与 let"
  },
  "tags": [
   "concept:basics"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "프로그램은 결국 **값**을 다루는 일입니다. `1`, `3.14`, `\"안녕\"`, `True` — 이 모두가 값이에요.\n\nGleam에서는 `let`으로 값에 **이름**을 붙입니다. `let pi = 3.14`라고 쓰면 그 시점부터 `pi`라는 이름이 `3.14`를 가리킵니다.",
     "en": "Programming is, in the end, all about working with **values**. `1`, `3.14`, `\"hello\"`, `True` — these are all values.\n\nIn Gleam you give a value a **name** with `let`. When you write `let pi = 3.14`, from that point on the name `pi` refers to `3.14`.",
     "zh": "编程说到底就是在处理**值**。`1`、`3.14`、`\"你好\"`、`True`——这些都是值。\n\n在 Gleam 中，用 `let` 给值起一个**名字**。写下 `let pi = 3.14` 之后，名字 `pi` 就指向 `3.14`。"
    }
   },
   {
    "kind": "exercise",
    "id": "bind-syntax",
    "type": "choice",
    "prompt": {
     "ko": "함수 본문 안에서 값을 이름에 묶는 올바른 문법은 무엇일까요?",
     "en": "Inside a function body, what is the correct syntax for binding a value to a name?",
     "zh": "在函数体内，把值绑定到名字上的正确语法是什么？"
    },
    "choices": [
     {
      "ko": "`x = 5`",
      "en": "`x = 5`",
      "zh": "`x = 5`"
     },
     {
      "ko": "`let x = 5`",
      "en": "`let x = 5`",
      "zh": "`let x = 5`"
     },
     {
      "ko": "`var x = 5`",
      "en": "`var x = 5`",
      "zh": "`var x = 5`"
     },
     {
      "ko": "`const x = 5`",
      "en": "`const x = 5`",
      "zh": "`const x = 5`"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! Gleam은 함수 안에서 `let`으로만 바인딩합니다. `var`도 없고, 재대입도 없어요.",
     "en": "Correct! In Gleam you bind inside a function only with `let`. There is no `var`, and no reassignment either.",
     "zh": "没错！在 Gleam 的函数里只能用 `let` 来绑定。既没有 `var`，也没有重新赋值。"
    },
    "feedback": {
     "0": {
      "ko": "`=`만으로는 안 됩니다. 바인딩엔 반드시 `let`이 필요해요.",
      "en": "`=` on its own won't do it. A binding always needs `let`.",
      "zh": "只写 `=` 是不行的。绑定一定要用 `let`。"
     },
     "2": {
      "ko": "Gleam에는 `var`가 없습니다 — 재할당이라는 개념 자체가 없으니까요.",
      "en": "Gleam has no `var` — there's no such thing as reassignment in the first place.",
      "zh": "Gleam 没有 `var`——因为它根本没有“重新赋值”这个概念。"
     },
     "3": {
      "ko": "`const`는 모듈 최상위 상수용입니다. 함수 안의 바인딩은 `let`이에요.",
      "en": "`const` is for module-level top-level constants. Bindings inside a function use `let`.",
      "zh": "`const` 用于模块顶层的常量。函数内部的绑定用 `let`。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "use-name",
    "markdown": {
     "ko": "이름을 붙이면 뒤에서 그 이름으로 값을 다시 꺼내 쓸 수 있습니다. 표현식 안에서 이름은 곧 그 값으로 치환된다고 생각하면 됩니다.",
     "en": "Once you've named a value, you can pull it back out later by that name. Think of a name inside an expression as being substituted by its value.",
     "zh": "起了名字之后，就可以在后面用这个名字把值取出来。可以把表达式中的名字理解为会被替换成它所指向的值。"
    }
   },
   {
    "kind": "exercise",
    "id": "let-use",
    "type": "predict",
    "prompt": {
     "ko": "아래 코드가 끝났을 때 `total`의 값은?",
     "en": "What is the value of `total` when the code below finishes?",
     "zh": "下面的代码执行完后，`total` 的值是多少？"
    },
    "code": {
     "ko": "let price = 100\nlet count = 3\nlet total = price * count",
     "en": "let price = 100\nlet count = 3\nlet total = price * count",
     "zh": "let price = 100\nlet count = 3\nlet total = price * count"
    },
    "choices": [
     {
      "ko": "`3`",
      "en": "`3`",
      "zh": "`3`"
     },
     {
      "ko": "`100`",
      "en": "`100`",
      "zh": "`100`"
     },
     {
      "ko": "`300`",
      "en": "`300`",
      "zh": "`300`"
     },
     {
      "ko": "`103`",
      "en": "`103`",
      "zh": "`103`"
     }
    ],
    "answer": 2,
    "correct": {
     "ko": "정확해요! `price`는 100, `count`는 3 — `total`은 100 * 3 = 300입니다.",
     "en": "Exactly! `price` is 100 and `count` is 3 — so `total` is 100 * 3 = 300.",
     "zh": "完全正确！`price` 是 100，`count` 是 3——所以 `total` 是 100 * 3 = 300。"
    },
    "feedback": {
     "0": {
      "ko": "`count`(3)만 본 거예요. `total`은 `price * count`로 계산됩니다.",
      "en": "You only looked at `count` (3). `total` is computed as `price * count`.",
      "zh": "你只看了 `count`（3）。`total` 是按 `price * count` 计算的。"
     },
     "1": {
      "ko": "`price`(100)만 본 거예요. `count`를 곱해야 합니다.",
      "en": "You only looked at `price` (100). You still need to multiply by `count`.",
      "zh": "你只看了 `price`（100）。还要乘上 `count`。"
     },
     "3": {
      "ko": "`*`는 곱셈입니다 — 더하기(100+3)가 아니라 100*3 = 300이에요.",
      "en": "`*` is multiplication — not addition (100+3) but 100*3 = 300.",
      "zh": "`*` 是乘法——不是加法（100+3），而是 100*3 = 300。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u01-values",
  "id": "l02-immutability",
  "title": {
   "ko": "불변성과 shadowing",
   "en": "Immutability and shadowing",
   "zh": "不可变性与 shadowing"
  },
  "tags": [
   "concept:basics",
   "tricky:shadowing"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "Gleam에는 변수 \"수정\"이 없습니다. 한번 `let`으로 묶인 값은 절대 바뀌지 않아요 — 모든 것이 **불변(immutable)**입니다.\n\n그렇다면 \"값을 바꾸고 싶을 때\"는? 바꾸는 대신, **같은 이름에 다시 `let`**을 씁니다. 이러면 그 시점부터 새 값을 가리키는 새 바인딩이 이전 것을 가립니다 — 이를 **shadowing**이라 합니다. 값이 변한 게 아니라 이름이 새것을 가리킬 뿐이에요.",
     "en": "Gleam has no way to \"modify\" a variable. Once a value is bound with `let`, it never changes — everything is **immutable**.\n\nSo what about \"when you want to change a value\"? Instead of changing it, you write **`let` again with the same name**. From that point on, a new binding pointing at the new value shadows the previous one — this is called **shadowing**. The value didn't change; the name simply points at something new.",
     "zh": "Gleam 中没有“修改”变量这回事。一旦用 `let` 绑定了值，它就永远不会改变——一切都是**不可变的（immutable）**。\n\n那么“想改变一个值”时该怎么办？不是去修改它，而是**对同一个名字再写一次 `let`**。从那一刻起，指向新值的新绑定会遮蔽之前的绑定——这叫作 **shadowing（遮蔽）**。值本身没有变，只是名字指向了新的东西。"
    }
   },
   {
    "kind": "exercise",
    "id": "shadowing-value",
    "type": "predict",
    "prompt": {
     "ko": "아래 코드가 끝났을 때 `x`의 값은?",
     "en": "What is the value of `x` when the code below finishes?",
     "zh": "下面的代码执行完后，`x` 的值是多少？"
    },
    "code": {
     "ko": "let x = 1\nlet x = x + 1\nlet x = x * 10",
     "en": "let x = 1\nlet x = x + 1\nlet x = x * 10",
     "zh": "let x = 1\nlet x = x + 1\nlet x = x * 10"
    },
    "choices": [
     {
      "ko": "`2`",
      "en": "`2`",
      "zh": "`2`"
     },
     {
      "ko": "`11`",
      "en": "`11`",
      "zh": "`11`"
     },
     {
      "ko": "`20`",
      "en": "`20`",
      "zh": "`20`"
     },
     {
      "ko": "`1`",
      "en": "`1`",
      "zh": "`1`"
     }
    ],
    "answer": 2,
    "correct": {
     "ko": "정확해요! 1 → (1+1)=2 → (2*10)=20. 각 줄의 `let`이 그 시점의 `x`로 계산해 새 바인딩을 만듭니다.",
     "en": "Exactly! 1 → (1+1)=2 → (2*10)=20. Each line's `let` computes using the `x` of that moment and creates a new binding.",
     "zh": "完全正确！1 → (1+1)=2 → (2*10)=20。每一行的 `let` 都用当时的 `x` 计算，并创建一个新绑定。"
    },
    "feedback": {
     "0": {
      "ko": "두 번째 줄까지만 계산했어요. 세 번째 줄 `x * 10`도 적용됩니다.",
      "en": "You only went as far as the second line. The third line `x * 10` applies too.",
      "zh": "你只算到了第二行。第三行的 `x * 10` 也会生效。"
     },
     "1": {
      "ko": "`x + 1 * 10`이 아니에요. 줄 단위로 차례대로 새 `x`가 묶입니다 — 2가 된 뒤 10을 곱해요.",
      "en": "It's not `x + 1 * 10`. A new `x` is bound line by line in order — it becomes 2, then is multiplied by 10.",
      "zh": "这不是 `x + 1 * 10`。新的 `x` 是逐行依次绑定的——先变成 2，再乘以 10。"
     },
     "3": {
      "ko": "`x`는 마지막 `let`의 결과를 가리킵니다 — 1이 아니라 20.",
      "en": "`x` refers to the result of the last `let` — 20, not 1.",
      "zh": "`x` 指向最后一个 `let` 的结果——是 20，不是 1。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "no-mutation",
    "markdown": {
     "ko": "주의: shadowing은 **재대입**과 다릅니다. `let x = ...`처럼 매번 `let`을 새로 쓰는 건 합법이지만, `x = x + 1`처럼 `let` 없이 다시 대입하는 건 Gleam에 아예 없는 문법이라 컴파일되지 않습니다.",
     "en": "Note: shadowing is different from **reassignment**. Writing a fresh `let` each time, like `let x = ...`, is legal, but reassigning without `let`, like `x = x + 1`, is syntax that simply doesn't exist in Gleam, so it won't compile.",
     "zh": "注意：shadowing 和**重新赋值**不同。像 `let x = ...` 这样每次都重新写 `let` 是合法的；但像 `x = x + 1` 这样不带 `let` 再次赋值，在 Gleam 中根本不存在这种语法，所以无法编译。"
    }
   },
   {
    "kind": "exercise",
    "id": "reassign-illegal",
    "type": "choice",
    "prompt": {
     "ko": "이미 `let total = 0`으로 묶은 뒤, 다음 줄에 `total = total + 100`이라고 쓰면?",
     "en": "After binding `let total = 0`, what happens if the next line is `total = total + 100`?",
     "zh": "已经用 `let total = 0` 绑定之后，如果下一行写 `total = total + 100`，会怎样？"
    },
    "choices": [
     {
      "ko": "`total`이 100으로 바뀐다",
      "en": "`total` becomes 100",
      "zh": "`total` 变成 100"
     },
     {
      "ko": "컴파일 에러 — Gleam엔 `let` 없는 재대입이 없다",
      "en": "Compile error — Gleam has no reassignment without `let`",
      "zh": "编译错误——Gleam 没有不带 `let` 的重新赋值"
     },
     {
      "ko": "새 `total` 바인딩이 생긴다",
      "en": "A new `total` binding is created",
      "zh": "产生一个新的 `total` 绑定"
     },
     {
      "ko": "런타임에 에러가 난다",
      "en": "It errors at runtime",
      "zh": "运行时报错"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! Gleam에는 재대입 연산자가 없습니다. 값을 \"갱신\"하려면 `let total = total + 100`처럼 새 `let`으로 이전 이름을 가리세요.",
     "en": "Correct! Gleam has no reassignment operator. To \"update\" a value, shadow the old name with a new `let`, like `let total = total + 100`.",
     "zh": "没错！Gleam 没有重新赋值运算符。想“更新”一个值，就用新的 `let` 遮蔽旧名字，比如 `let total = total + 100`。"
    },
    "feedback": {
     "0": {
      "ko": "값을 직접 바꾸는 일은 Gleam에 없습니다 — 그 줄은 아예 컴파일되지 않아요.",
      "en": "Changing a value in place doesn't exist in Gleam — that line won't even compile.",
      "zh": "Gleam 里不存在直接修改值的操作——这一行根本无法编译。"
     },
     "2": {
      "ko": "새 바인딩을 만들려면 앞에 `let`이 있어야 합니다. `let` 없는 줄은 합법 문법이 아니에요.",
      "en": "To create a new binding you need `let` in front. A line without `let` isn't valid syntax.",
      "zh": "要创建新绑定，前面必须有 `let`。不带 `let` 的这一行不是合法语法。"
     },
     "3": {
      "ko": "런타임이 아니라 **컴파일 타임**에 막힙니다 — 실행조차 되지 않아요.",
      "en": "It's stopped at **compile time**, not at runtime — it never even runs.",
      "zh": "它在**编译期**就被拦下了，而不是运行时——根本不会运行。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "capture",
    "markdown": {
     "ko": "불변성의 진짜 힘은 여기서 드러납니다. 어떤 이름이 함수 안에 **캡처(capture)**되면, 나중에 같은 이름을 shadowing해도 이미 캡처된 값은 영향받지 않습니다 — 값은 절대 변하지 않으니까요.",
     "en": "The real power of immutability shows up here. When a name is **captured** inside a function, later shadowing of that same name has no effect on the already-captured value — because values never change.",
     "zh": "不可变性真正的威力在这里显现。当一个名字被函数**捕获**（capture）之后，即使之后对这个名字进行 shadowing，已经捕获的值也不受影响——因为值永远不会改变。"
    }
   },
   {
    "kind": "exercise",
    "id": "shadow-capture",
    "type": "predict",
    "prompt": {
     "ko": "아래 코드에서 두 줄의 출력은 차례로 무엇일까요? (`f`는 만들어질 때의 `x`를 기억합니다)",
     "en": "In the code below, what do the two lines print, in order? (`f` remembers the `x` from when it was created)",
     "zh": "下面代码中的两行依次输出什么？（`f` 会记住它被创建时的 `x`）"
    },
    "code": {
     "ko": "let x = 1\nlet f = fn() { x }\nlet x = x + 10\necho x\necho f()",
     "en": "let x = 1\nlet f = fn() { x }\nlet x = x + 10\necho x\necho f()",
     "zh": "let x = 1\nlet f = fn() { x }\nlet x = x + 10\necho x\necho f()"
    },
    "choices": [
     {
      "ko": "`11` 그리고 `11`",
      "en": "`11` and `11`",
      "zh": "`11` 和 `11`"
     },
     {
      "ko": "`11` 그리고 `1`",
      "en": "`11` and `1`",
      "zh": "`11` 和 `1`"
     },
     {
      "ko": "`1` 그리고 `1`",
      "en": "`1` and `1`",
      "zh": "`1` 和 `1`"
     },
     {
      "ko": "컴파일 에러",
      "en": "Compile error",
      "zh": "编译错误"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "정확해요! `f`는 첫 번째 `x`(=1)를 캡처했습니다. 세 번째 줄의 `let x`는 **새 바인딩**일 뿐, `f`가 본 값을 바꾸지 못해요. 그래서 11과 1.",
     "en": "Exactly! `f` captured the first `x` (=1). The `let x` on the third line is just a **new binding** and can't change the value `f` saw. So it's 11 and 1.",
     "zh": "完全正确！`f` 捕获的是第一个 `x`（=1）。第三行的 `let x` 只是一个**新绑定**，改变不了 `f` 看到的值。所以输出 11 和 1。"
    },
    "feedback": {
     "0": {
      "ko": "shadowing은 mutation이 아니에요. `f`는 여전히 처음 캡처한 1을 봅니다 — 두 번째 출력은 1.",
      "en": "Shadowing is not mutation. `f` still sees the 1 it captured first — the second output is 1.",
      "zh": "shadowing 不是修改（mutation）。`f` 看到的仍然是最初捕获的 1——第二个输出是 1。"
     },
     "2": {
      "ko": "첫 출력 `x`는 마지막 `let`이 가리키는 11입니다 — 1이 아니에요.",
      "en": "The first output `x` is the 11 that the last `let` points to — not 1.",
      "zh": "第一个输出 `x` 是最后一个 `let` 指向的 11——不是 1。"
     },
     "3": {
      "ko": "같은 이름의 재-`let`(shadowing)은 합법입니다. 금지된 건 `let` 없는 재대입이에요.",
      "en": "Re-`let`ting the same name (shadowing) is legal. What's forbidden is reassignment without `let`.",
      "zh": "对同一个名字再次 `let`（shadowing）是合法的。被禁止的是不带 `let` 的重新赋值。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u01-values",
  "id": "l03-int-float",
  "title": {
   "ko": "Int와 Float는 남남",
   "en": "Int and Float are strangers",
   "zh": "Int 和 Float 互不相干"
  },
  "tags": [
   "concept:ints",
   "concept:floats"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "Gleam은 정수(`Int`)와 실수(`Float`)를 엄격히 구분합니다. 둘 사이의 **암묵적 변환이 없어요**.\n\n그래서 Float 연산자에는 점이 붙습니다: `+.`  `-.`  `*.`  `/.`  정수는 `+ - * /`를 그대로 씁니다.",
     "en": "Gleam strictly distinguishes integers (`Int`) from floats (`Float`). There is **no implicit conversion** between them.\n\nThat's why the Float operators carry a dot: `+.`  `-.`  `*.`  `/.`  Integers use plain `+ - * /`.",
     "zh": "Gleam 严格区分整数（`Int`）和浮点数（`Float`）。两者之间**没有隐式转换**。\n\n所以 Float 运算符都带一个点：`+.`  `-.`  `*.`  `/.`，整数则直接用 `+ - * /`。"
    }
   },
   {
    "kind": "exercise",
    "id": "int-div",
    "type": "predict",
    "prompt": {
     "ko": "정수 나눗셈의 결과는? (Gleam의 `/`는 정수끼리면 몫만 남깁니다)",
     "en": "What is the result of this integer division? (Gleam's `/` between two integers keeps only the quotient)",
     "zh": "这个整数除法的结果是什么？（Gleam 的 `/` 用于两个整数时只保留商）"
    },
    "code": {
     "ko": "10 / 3",
     "en": "10 / 3",
     "zh": "10 / 3"
    },
    "choices": [
     {
      "ko": "`3.333`",
      "en": "`3.333`",
      "zh": "`3.333`"
     },
     {
      "ko": "`3`",
      "en": "`3`",
      "zh": "`3`"
     },
     {
      "ko": "`4`",
      "en": "`4`",
      "zh": "`4`"
     },
     {
      "ko": "`3.0`",
      "en": "`3.0`",
      "zh": "`3.0`"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! 정수 나눗셈은 몫만 남깁니다 — 10 / 3 = 3.",
     "en": "Correct! Integer division keeps only the quotient — 10 / 3 = 3.",
     "zh": "没错！整数除法只保留商——10 / 3 = 3。"
    },
    "feedback": {
     "0": {
      "ko": "그건 실수 나눗셈의 결과예요. `/`는 정수끼리면 몫만 줍니다.",
      "en": "That's the result of float division. `/` between integers gives only the quotient.",
      "zh": "那是浮点数除法的结果。`/` 用于整数时只给出商。"
     },
     "2": {
      "ko": "내림이지 올림이 아니에요. 10 / 3의 몫은 3.",
      "en": "It rounds down, not up. The quotient of 10 / 3 is 3.",
      "zh": "是向下取整，不是向上取整。10 / 3 的商是 3。"
     },
     "3": {
      "ko": "결과는 `Int` 값 3이지 `Float` 3.0이 아니에요. 타입이 다릅니다.",
      "en": "The result is the `Int` value 3, not the `Float` 3.0. They're different types.",
      "zh": "结果是 `Int` 值 3，而不是 `Float` 3.0。它们是不同的类型。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "float-div",
    "type": "predict",
    "prompt": {
     "ko": "실수 나눗셈의 결과는?",
     "en": "What is the result of this float division?",
     "zh": "这个浮点数除法的结果是什么？"
    },
    "code": {
     "ko": "10.0 /. 4.0",
     "en": "10.0 /. 4.0",
     "zh": "10.0 /. 4.0"
    },
    "choices": [
     {
      "ko": "`2`",
      "en": "`2`",
      "zh": "`2`"
     },
     {
      "ko": "`2.5`",
      "en": "`2.5`",
      "zh": "`2.5`"
     },
     {
      "ko": "`2.0`",
      "en": "`2.0`",
      "zh": "`2.0`"
     },
     {
      "ko": "컴파일 에러",
      "en": "Compile error",
      "zh": "编译错误"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "정확해요! `/.`는 Float 나눗셈이라 2.5를 줍니다.",
     "en": "Exactly! `/.` is Float division, so it gives 2.5.",
     "zh": "完全正确！`/.` 是 Float 除法，所以结果是 2.5。"
    },
    "feedback": {
     "0": {
      "ko": "결과는 `Float`예요 — `2`(Int)가 아니라 `2.5`.",
      "en": "The result is a `Float` — `2.5`, not `2` (an Int).",
      "zh": "结果是 `Float`——是 `2.5`，而不是 `2`（Int）。"
     },
     "2": {
      "ko": "10.0 /. 4.0 = 2.5입니다. 2.0이 아니에요.",
      "en": "10.0 /. 4.0 = 2.5. It's not 2.0.",
      "zh": "10.0 /. 4.0 = 2.5，不是 2.0。"
     },
     "3": {
      "ko": "`/.`는 올바른 Float 연산자라 정상 컴파일됩니다.",
      "en": "`/.` is the correct Float operator, so it compiles fine.",
      "zh": "`/.` 是正确的 Float 运算符，可以正常编译。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "no-mixing",
    "markdown": {
     "ko": "정수와 실수를 한 연산에 **섞으면 컴파일되지 않습니다**. Gleam은 조용히 변환하지 않아요 — 변환이 필요하면 `int.to_float` 같은 함수로 명시해야 합니다.",
     "en": "**Mixing** an integer and a float in one operation **won't compile**. Gleam doesn't convert silently — if you need a conversion you must make it explicit with a function like `int.to_float`.",
     "zh": "整数和浮点数一旦在同一个运算中**混用，就无法编译**。Gleam 不会悄悄帮你转换——需要转换时，必须用 `int.to_float` 这样的函数显式写出来。"
    }
   },
   {
    "kind": "exercise",
    "id": "mixed-arith",
    "type": "choice",
    "prompt": {
     "ko": "표현식 `1 + 2.0`을 Gleam이 어떻게 다룰까요?",
     "en": "How does Gleam handle the expression `1 + 2.0`?",
     "zh": "Gleam 会怎样处理表达式 `1 + 2.0`？"
    },
    "choices": [
     {
      "ko": "`3.0`",
      "en": "`3.0`",
      "zh": "`3.0`"
     },
     {
      "ko": "`3`",
      "en": "`3`",
      "zh": "`3`"
     },
     {
      "ko": "컴파일 에러 (타입 불일치)",
      "en": "Compile error (type mismatch)",
      "zh": "编译错误（类型不匹配）"
     },
     {
      "ko": "`2.0`으로 반올림",
      "en": "Rounds to `2.0`",
      "zh": "舍入为 `2.0`"
     }
    ],
    "answer": 2,
    "correct": {
     "ko": "맞아요! `Int`와 `Float`는 섞을 수 없어요. 컴파일러가 타입 불일치(Type mismatch) 에러로 막습니다.",
     "en": "Correct! `Int` and `Float` cannot be mixed. The compiler stops it with a Type mismatch error.",
     "zh": "没错！`Int` 和 `Float` 不能混用。编译器会以类型不匹配（Type mismatch）错误拦下它。"
    },
    "feedback": {
     "0": {
      "ko": "암묵적 변환이 없어서 3.0이 되지 않아요 — 아예 컴파일이 안 됩니다.",
      "en": "There's no implicit conversion, so it doesn't become 3.0 — it doesn't compile at all.",
      "zh": "没有隐式转换，所以不会变成 3.0——根本无法编译。"
     },
     "1": {
      "ko": "Int로 변환되지도 않습니다. 타입이 어긋나면 컴파일 에러예요.",
      "en": "It isn't converted to an Int either. A type mismatch is a compile error.",
      "zh": "也不会被转换成 Int。类型不匹配就是编译错误。"
     },
     "3": {
      "ko": "Gleam은 조용히 변환하지 않습니다 — 직접 `int.to_float(1)`을 써야 해요.",
      "en": "Gleam doesn't convert silently — you must write `int.to_float(1)` yourself.",
      "zh": "Gleam 不会悄悄转换——你必须自己写 `int.to_float(1)`。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "fix-float-op",
    "type": "choice",
    "prompt": {
     "ko": "`Float`를 받아 0.5를 더하려는 함수 본문 `x + 0.5`가 컴파일 에러(\"Use +. instead\")를 냅니다. 올바른 수정은?",
     "en": "A function body `x + 0.5` (taking a `Float` and adding 0.5) gives a compile error (\"Use +. instead\"). What's the correct fix?",
     "zh": "某个函数接收一个 `Float` 并想给它加上 0.5，但函数体 `x + 0.5` 报了编译错误（“Use +. instead”）。正确的改法是？"
    },
    "choices": [
     {
      "ko": "`x +. 0.5`",
      "en": "`x +. 0.5`",
      "zh": "`x +. 0.5`"
     },
     {
      "ko": "`x + 0.5.0`",
      "en": "`x + 0.5.0`",
      "zh": "`x + 0.5.0`"
     },
     {
      "ko": "`x .+ 0.5`",
      "en": "`x .+ 0.5`",
      "zh": "`x .+ 0.5`"
     },
     {
      "ko": "`x + int.to_float(0.5)`",
      "en": "`x + int.to_float(0.5)`",
      "zh": "`x + int.to_float(0.5)`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! Float 덧셈 연산자는 점이 붙은 `+.`입니다. `x +. 0.5`로 고치면 됩니다.",
     "en": "Correct! The Float addition operator is the dotted `+.`. Fixing it to `x +. 0.5` works.",
     "zh": "没错！Float 加法运算符是带点的 `+.`。改成 `x +. 0.5` 就行了。"
    },
    "feedback": {
     "1": {
      "ko": "`0.5.0` 같은 숫자 표기는 없습니다 — 연산자를 `+.`로 바꿔야 해요.",
      "en": "There's no number notation like `0.5.0` — you need to change the operator to `+.`.",
      "zh": "不存在 `0.5.0` 这样的数字写法——应该把运算符改成 `+.`。"
     },
     "2": {
      "ko": "점은 연산자 **뒤**에 붙습니다: `+.` `-.` `*.` `/.` — `.+`는 없는 문법이에요.",
      "en": "The dot goes **after** the operator: `+.` `-.` `*.` `/.` — `.+` isn't valid syntax.",
      "zh": "点要加在运算符**后面**：`+.` `-.` `*.` `/.`——`.+` 不是合法语法。"
     },
     "3": {
      "ko": "`0.5`는 이미 `Float`라 변환이 불필요하고, 문제는 연산자(`+` → `+.`)에 있습니다.",
      "en": "`0.5` is already a `Float`, so no conversion is needed; the problem is the operator (`+` → `+.`).",
      "zh": "`0.5` 本来就是 `Float`，不需要转换；问题出在运算符上（`+` → `+.`）。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u01-values",
  "id": "l04-expressions",
  "title": {
   "ko": "모든 것이 표현식",
   "en": "Everything is an expression",
   "zh": "一切皆表达式"
  },
  "tags": [
   "concept:basics",
   "tricky:expressions-everywhere"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "Gleam에는 \"문장(statement)\"이 없습니다. `case`도, 중괄호 블록 `{ ... }`도, 조건 분기도 전부 **값을 내는 표현식**이에요.\n\n그래서 다른 언어처럼 \"if 안에서 변수에 대입\"하지 않습니다. 대신 **표현식의 결과를 통째로 `let`에 묶습니다**.",
     "en": "Gleam has no \"statements.\" `case`, brace blocks `{ ... }`, conditional branches — they're all **expressions that produce a value**.\n\nSo, unlike other languages, you don't \"assign to a variable inside an if.\" Instead, you **bind the whole result of an expression with `let`**.",
     "zh": "Gleam 中没有“语句（statement）”。`case`、花括号块 `{ ... }`、条件分支，全都是**产生值的表达式**。\n\n所以在 Gleam 中，不会像其他语言那样“在 if 里给变量赋值”，而是**把整个表达式的结果用 `let` 绑定起来**。"
    }
   },
   {
    "kind": "exercise",
    "id": "block-value",
    "type": "predict",
    "prompt": {
     "ko": "중괄호 블록도 표현식입니다 — 마지막 줄의 값이 블록 전체의 값이 돼요. `y`의 값은?",
     "en": "A brace block is an expression too — the value of its last line is the value of the whole block. What is `y`?",
     "zh": "花括号块也是表达式——最后一行的值就是整个块的值。`y` 的值是多少？"
    },
    "code": {
     "ko": "let y = {\n  let a = 2\n  a + 3\n}",
     "en": "let y = {\n  let a = 2\n  a + 3\n}",
     "zh": "let y = {\n  let a = 2\n  a + 3\n}"
    },
    "choices": [
     {
      "ko": "`5`",
      "en": "`5`",
      "zh": "`5`"
     },
     {
      "ko": "`2`",
      "en": "`2`",
      "zh": "`2`"
     },
     {
      "ko": "`3`",
      "en": "`3`",
      "zh": "`3`"
     },
     {
      "ko": "`Nil`",
      "en": "`Nil`",
      "zh": "`Nil`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "정확해요! 블록의 마지막 표현식 `a + 3`(=5)이 블록 전체의 값이고, 그게 `y`에 묶입니다.",
     "en": "Exactly! The block's last expression `a + 3` (=5) is the value of the whole block, and that's bound to `y`.",
     "zh": "完全正确！块中最后一个表达式 `a + 3`（=5）就是整个块的值，它被绑定到 `y`。"
    },
    "feedback": {
     "1": {
      "ko": "`a`(2)는 블록 중간 값이에요. 블록의 값은 **마지막 표현식**입니다.",
      "en": "`a` (2) is an intermediate value in the block. The block's value is its **last expression**.",
      "zh": "`a`（2）只是块中间的值。块的值是**最后一个表达式**。"
     },
     "2": {
      "ko": "`3`은 리터럴일 뿐, `a + 3`이 계산되어 5가 됩니다.",
      "en": "`3` is just a literal; `a + 3` is computed and becomes 5.",
      "zh": "`3` 只是一个字面量，`a + 3` 计算后得到 5。"
     },
     "3": {
      "ko": "블록은 마지막 표현식의 값을 돌려줍니다 — `Nil`이 아니라 5예요.",
      "en": "A block returns the value of its last expression — 5, not `Nil`.",
      "zh": "块返回最后一个表达式的值——是 5，而不是 `Nil`。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "case-is-expression",
    "markdown": {
     "ko": "`case`도 값을 내는 표현식이라 그 결과를 바로 `let`에 묶을 수 있습니다. 가드(`if ...`)가 붙은 가지는 **위에서 아래로** 검사되어, 처음으로 참이 되는 가지가 선택됩니다.",
     "en": "`case` is also an expression that yields a value, so you can bind its result directly with `let`. Branches with a guard (`if ...`) are checked **top to bottom**, and the first one that is true is chosen.",
     "zh": "`case` 也是产生值的表达式，所以可以直接用 `let` 绑定它的结果。带守卫（`if ...`）的分支会**从上到下**依次检查，选中第一个为真的分支。"
    }
   },
   {
    "kind": "exercise",
    "id": "grade-85",
    "type": "predict",
    "prompt": {
     "ko": "아래 `grade` 함수에서 `grade(85)`의 값은?",
     "en": "In the `grade` function below, what is the value of `grade(85)`?",
     "zh": "在下面的 `grade` 函数中，`grade(85)` 的值是什么？"
    },
    "code": {
     "ko": "fn grade(score: Int) -> String {\n  case score {\n    s if s >= 90 -> \"A\"\n    s if s >= 80 -> \"B\"\n    _ -> \"F\"\n  }\n}\n\ngrade(85)",
     "en": "fn grade(score: Int) -> String {\n  case score {\n    s if s >= 90 -> \"A\"\n    s if s >= 80 -> \"B\"\n    _ -> \"F\"\n  }\n}\n\ngrade(85)",
     "zh": "fn grade(score: Int) -> String {\n  case score {\n    s if s >= 90 -> \"A\"\n    s if s >= 80 -> \"B\"\n    _ -> \"F\"\n  }\n}\n\ngrade(85)"
    },
    "choices": [
     {
      "ko": "`\"A\"`",
      "en": "`\"A\"`",
      "zh": "`\"A\"`"
     },
     {
      "ko": "`\"B\"`",
      "en": "`\"B\"`",
      "zh": "`\"B\"`"
     },
     {
      "ko": "`\"F\"`",
      "en": "`\"F\"`",
      "zh": "`\"F\"`"
     },
     {
      "ko": "`85`",
      "en": "`85`",
      "zh": "`85`"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! 가드는 위에서부터 검사됩니다. `85 >= 90`은 거짓이라 건너뛰고, `85 >= 80`은 참이라 \"B\"가 선택돼요.",
     "en": "Correct! Guards are checked from the top. `85 >= 90` is false so it's skipped, and `85 >= 80` is true, so \"B\" is chosen.",
     "zh": "没错！守卫从上往下检查。`85 >= 90` 为假，跳过；`85 >= 80` 为真，于是选中 \"B\"。"
    },
    "feedback": {
     "0": {
      "ko": "`85 >= 90`은 거짓이라 첫 가지는 건너뜁니다 — 다음 가지로 내려가요.",
      "en": "`85 >= 90` is false, so the first branch is skipped — it falls through to the next one.",
      "zh": "`85 >= 90` 为假，所以跳过第一个分支——继续往下走。"
     },
     "2": {
      "ko": "`_` 가지까지 가지 않습니다. `85 >= 80`이 참이라 그 위에서 멈춰요.",
      "en": "It never reaches the `_` branch. `85 >= 80` is true, so it stops above that.",
      "zh": "不会走到 `_` 分支。`85 >= 80` 为真，在它上面就停下了。"
     },
     "3": {
      "ko": "`case`는 매칭된 입력이 아니라 가지의 **결과**를 돌려줍니다 — 85가 아니라 \"B\".",
      "en": "`case` returns the **result** of the chosen branch, not the matched input — \"B\", not 85.",
      "zh": "`case` 返回的是被选中分支的**结果**，而不是被匹配的输入——是 \"B\"，不是 85。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "grade-95",
    "type": "predict",
    "prompt": {
     "ko": "같은 `grade` 함수에서 `grade(95)`의 값은?",
     "en": "In the same `grade` function, what is the value of `grade(95)`?",
     "zh": "在同一个 `grade` 函数中，`grade(95)` 的值是什么？"
    },
    "code": {
     "ko": "fn grade(score: Int) -> String {\n  case score {\n    s if s >= 90 -> \"A\"\n    s if s >= 80 -> \"B\"\n    _ -> \"F\"\n  }\n}\n\ngrade(95)",
     "en": "fn grade(score: Int) -> String {\n  case score {\n    s if s >= 90 -> \"A\"\n    s if s >= 80 -> \"B\"\n    _ -> \"F\"\n  }\n}\n\ngrade(95)",
     "zh": "fn grade(score: Int) -> String {\n  case score {\n    s if s >= 90 -> \"A\"\n    s if s >= 80 -> \"B\"\n    _ -> \"F\"\n  }\n}\n\ngrade(95)"
    },
    "choices": [
     {
      "ko": "`\"A\"`",
      "en": "`\"A\"`",
      "zh": "`\"A\"`"
     },
     {
      "ko": "`\"B\"`",
      "en": "`\"B\"`",
      "zh": "`\"B\"`"
     },
     {
      "ko": "`\"F\"`",
      "en": "`\"F\"`",
      "zh": "`\"F\"`"
     },
     {
      "ko": "컴파일 에러",
      "en": "Compile error",
      "zh": "编译错误"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "정확해요! `95 >= 90`이 참이라 첫 가지가 선택되어 \"A\"입니다.",
     "en": "Exactly! `95 >= 90` is true, so the first branch is chosen and the result is \"A\".",
     "zh": "完全正确！`95 >= 90` 为真，所以选中第一个分支，结果是 \"A\"。"
    },
    "feedback": {
     "1": {
      "ko": "첫 가지 `s if s >= 90`이 이미 참이라 거기서 멈춥니다 — \"B\"까지 가지 않아요.",
      "en": "The first branch `s if s >= 90` is already true, so it stops there — it never reaches \"B\".",
      "zh": "第一个分支 `s if s >= 90` 已经为真，就在那里停下——不会走到 \"B\"。"
     },
     "2": {
      "ko": "`_`는 맨 아래 가지예요. 위에서 이미 매칭됐으니 도달하지 않습니다.",
      "en": "`_` is the bottom branch. Since something already matched above, it's never reached.",
      "zh": "`_` 是最下面的分支。上面已经匹配成功，所以不会到达它。"
     },
     "3": {
      "ko": "정상 컴파일됩니다 — `_` 가지가 나머지 모든 경우를 받아 빠짐없이 다뤄요.",
      "en": "It compiles fine — the `_` branch catches all remaining cases, covering everything exhaustively.",
      "zh": "可以正常编译——`_` 分支接住了剩下的所有情况，做到了穷尽匹配。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u01-values",
  "id": "l05-string-bool",
  "title": {
   "ko": "String과 Bool, 그리고 echo/io.println",
   "en": "String and Bool, plus echo/io.println",
   "zh": "String 与 Bool，以及 echo/io.println"
  },
  "tags": [
   "concept:basics"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "남은 기본 타입 두 가지입니다. **`String`**은 큰따옴표로 감싼 글자들(`\"안녕\"`)이고, 이어붙일 때는 `<>` 연산자를 씁니다. **`Bool`**은 `True` 또는 `False`이며, `&&`(그리고), `||`(또는), `!`(부정)로 조합합니다.",
     "en": "Here are the last two basic types. A **`String`** is characters wrapped in double quotes (`\"hello\"`), and you join them with the `<>` operator. A **`Bool`** is `True` or `False`, and you combine them with `&&` (and), `||` (or), and `!` (not).",
     "zh": "还剩下两种基本类型。**`String`** 是用双引号括起来的一串字符（`\"你好\"`），用 `<>` 运算符拼接。**`Bool`** 是 `True` 或 `False`，用 `&&`（与）、`||`（或）、`!`（非）来组合。"
    }
   },
   {
    "kind": "exercise",
    "id": "string-concat",
    "type": "predict",
    "prompt": {
     "ko": "문자열 이어붙이기 `<>`의 결과는?",
     "en": "What is the result of the string concatenation `<>`?",
     "zh": "字符串拼接 `<>` 的结果是什么？"
    },
    "code": {
     "ko": "\"ab\" <> \"cd\"",
     "en": "\"ab\" <> \"cd\"",
     "zh": "\"ab\" <> \"cd\""
    },
    "choices": [
     {
      "ko": "`\"abcd\"`",
      "en": "`\"abcd\"`",
      "zh": "`\"abcd\"`"
     },
     {
      "ko": "`\"ab cd\"`",
      "en": "`\"ab cd\"`",
      "zh": "`\"ab cd\"`"
     },
     {
      "ko": "`\"cdab\"`",
      "en": "`\"cdab\"`",
      "zh": "`\"cdab\"`"
     },
     {
      "ko": "`\"ab+cd\"`",
      "en": "`\"ab+cd\"`",
      "zh": "`\"ab+cd\"`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! `<>`는 왼쪽 문자열 뒤에 오른쪽을 그대로 붙입니다 — \"abcd\".",
     "en": "Correct! `<>` sticks the right string directly onto the end of the left one — \"abcd\".",
     "zh": "没错！`<>` 把右边的字符串原样接在左边字符串的后面——得到 \"abcd\"。"
    },
    "feedback": {
     "1": {
      "ko": "`<>`는 사이에 공백을 넣지 않아요 — 그대로 붙여 \"abcd\".",
      "en": "`<>` doesn't insert a space in between — it joins them directly to get \"abcd\".",
      "zh": "`<>` 不会在中间插入空格——直接拼接得到 \"abcd\"。"
     },
     "2": {
      "ko": "순서가 뒤집히지 않습니다 — 왼쪽이 앞, 오른쪽이 뒤예요.",
      "en": "The order isn't reversed — the left side comes first, the right side after.",
      "zh": "顺序不会颠倒——左边在前，右边在后。"
     },
     "3": {
      "ko": "`<>`는 연산 기호를 글자로 끼워넣지 않습니다 — 순수하게 이어붙여요.",
      "en": "`<>` doesn't slip the operator symbol in as a character — it concatenates purely.",
      "zh": "`<>` 不会把运算符号当作字符插进去——它只是单纯地拼接。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "bool-and",
    "type": "predict",
    "prompt": {
     "ko": "Bool 연산 `True && False`의 값은?",
     "en": "What is the value of the Bool operation `True && False`?",
     "zh": "Bool 运算 `True && False` 的值是什么？"
    },
    "code": {
     "ko": "True && False",
     "en": "True && False",
     "zh": "True && False"
    },
    "choices": [
     {
      "ko": "`True`",
      "en": "`True`",
      "zh": "`True`"
     },
     {
      "ko": "`False`",
      "en": "`False`",
      "zh": "`False`"
     },
     {
      "ko": "`Nil`",
      "en": "`Nil`",
      "zh": "`Nil`"
     },
     {
      "ko": "컴파일 에러",
      "en": "Compile error",
      "zh": "编译错误"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "정확해요! `&&`(AND)는 양쪽이 모두 `True`일 때만 `True`입니다 — 하나라도 `False`면 `False`.",
     "en": "Exactly! `&&` (AND) is `True` only when both sides are `True` — if even one is `False`, it's `False`.",
     "zh": "完全正确！`&&`（AND）只有在两边都为 `True` 时才是 `True`——只要有一边是 `False`，结果就是 `False`。"
    },
    "feedback": {
     "0": {
      "ko": "`&&`는 둘 다 참일 때만 참이에요. 하나가 `False`라 결과는 `False`.",
      "en": "`&&` is true only when both are true. One side is `False`, so the result is `False`.",
      "zh": "`&&` 只有两边都为真时才为真。有一边是 `False`，所以结果是 `False`。"
     },
     "2": {
      "ko": "`&&`의 결과는 항상 `Bool`입니다 — `Nil`이 아니라 `False`.",
      "en": "The result of `&&` is always a `Bool` — `False`, not `Nil`.",
      "zh": "`&&` 的结果总是 `Bool`——是 `False`，不是 `Nil`。"
     },
     "3": {
      "ko": "`&&`는 두 `Bool`에 쓰는 올바른 연산자라 정상 컴파일됩니다.",
      "en": "`&&` is the correct operator for two `Bool`s, so it compiles fine.",
      "zh": "`&&` 是用于两个 `Bool` 的正确运算符，可以正常编译。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "bool-or",
    "type": "predict",
    "prompt": {
     "ko": "Bool 연산 `False || True`의 값은?",
     "en": "What is the value of the Bool operation `False || True`?",
     "zh": "Bool 运算 `False || True` 的值是什么？"
    },
    "code": {
     "ko": "False || True",
     "en": "False || True",
     "zh": "False || True"
    },
    "choices": [
     {
      "ko": "`True`",
      "en": "`True`",
      "zh": "`True`"
     },
     {
      "ko": "`False`",
      "en": "`False`",
      "zh": "`False`"
     },
     {
      "ko": "`Nil`",
      "en": "`Nil`",
      "zh": "`Nil`"
     },
     {
      "ko": "컴파일 에러",
      "en": "Compile error",
      "zh": "编译错误"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! `||`(OR)는 한쪽이라도 `True`면 `True`입니다.",
     "en": "Correct! `||` (OR) is `True` if even one side is `True`.",
     "zh": "没错！`||`（OR）只要有一边为 `True`，结果就是 `True`。"
    },
    "feedback": {
     "1": {
      "ko": "`||`는 하나라도 참이면 참이에요 — 오른쪽이 `True`라 결과는 `True`.",
      "en": "`||` is true if even one side is true — the right side is `True`, so the result is `True`.",
      "zh": "`||` 只要有一边为真就为真——右边是 `True`，所以结果是 `True`。"
     },
     "2": {
      "ko": "`||`의 결과는 항상 `Bool`입니다 — `Nil`이 아니라 `True`.",
      "en": "The result of `||` is always a `Bool` — `True`, not `Nil`.",
      "zh": "`||` 的结果总是 `Bool`——是 `True`，不是 `Nil`。"
     },
     "3": {
      "ko": "`||`는 두 `Bool`에 쓰는 올바른 연산자라 정상 컴파일됩니다.",
      "en": "`||` is the correct operator for two `Bool`s, so it compiles fine.",
      "zh": "`||` 是用于两个 `Bool` 的正确运算符，可以正常编译。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "echo-vs-println",
    "markdown": {
     "ko": "값을 화면에 찍는 두 가지 방법이 있습니다. **`io.println`**은 `String`만 받아 그 글자를 그대로 출력합니다(`import gleam/io` 필요). **`echo`**는 디버그용 키워드로, **어떤 타입의 값이든** 받아 사람이 읽기 좋은 모양으로 찍어줍니다(import 불필요) — 그래서 `Int`나 `Bool`을 빠르게 들여다볼 때 편합니다.",
     "en": "There are two ways to print a value to the screen. **`io.println`** takes only a `String` and prints those characters as-is (requires `import gleam/io`). **`echo`** is a debug keyword that takes **a value of any type** and prints it in a human-readable form (no import needed) — so it's handy for quickly peeking at an `Int` or a `Bool`.",
     "zh": "把值打印到屏幕上有两种方法。**`io.println`** 只接收 `String`，并原样输出这些字符（需要 `import gleam/io`）。**`echo`** 是用于调试的关键字，可以接收**任意类型的值**，并以便于阅读的形式打印出来（无需 import）——所以想快速查看 `Int` 或 `Bool` 时很方便。"
    }
   },
   {
    "kind": "exercise",
    "id": "echo-or-println",
    "type": "choice",
    "prompt": {
     "ko": "정수 `total` 하나를 별다른 import 없이, 가장 빠르게 화면에 찍어 확인하려면?",
     "en": "What's the fastest way to print a single integer `total` to the screen to check it, with no extra imports?",
     "zh": "不额外 import，想最快地把一个整数 `total` 打印到屏幕上确认一下，该怎么写？"
    },
    "choices": [
     {
      "ko": "`io.println(total)`",
      "en": "`io.println(total)`",
      "zh": "`io.println(total)`"
     },
     {
      "ko": "`echo total`",
      "en": "`echo total`",
      "zh": "`echo total`"
     },
     {
      "ko": "`io.println(\"total\")`",
      "en": "`io.println(\"total\")`",
      "zh": "`io.println(\"total\")`"
     },
     {
      "ko": "`print(total)`",
      "en": "`print(total)`",
      "zh": "`print(total)`"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! `echo`는 어떤 타입이든 받고 import도 필요 없어 디버그에 안성맞춤입니다 — `Int`도 알아서 보기 좋게 찍어줘요.",
     "en": "Correct! `echo` takes any type and needs no import, so it's perfect for debugging — it'll print an `Int` nicely on its own.",
     "zh": "没错！`echo` 接收任意类型，也不需要 import，非常适合调试——`Int` 也会自动以易读的形式打印出来。"
    },
    "feedback": {
     "0": {
      "ko": "`io.println`은 `String`만 받습니다. `Int`인 `total`을 넘기면 타입 에러예요 — `int.to_string`이 필요합니다.",
      "en": "`io.println` takes only a `String`. Passing the `Int` `total` is a type error — you'd need `int.to_string`.",
      "zh": "`io.println` 只接收 `String`。传入 `Int` 类型的 `total` 会产生类型错误——需要先用 `int.to_string` 转换。"
     },
     "2": {
      "ko": "그러면 변수 값이 아니라 글자 `total`이 그대로 찍힙니다 — 우리가 원한 건 숫자 값이에요.",
      "en": "That prints the literal text `total`, not the variable's value — what we wanted was the number.",
      "zh": "这样打印出来的是文字 `total` 本身，而不是变量的值——我们想要的是那个数字。"
     },
     "3": {
      "ko": "Gleam에는 `print`라는 함수가 없습니다 — `io.println` 또는 `echo`를 씁니다.",
      "en": "Gleam has no `print` function — use `io.println` or `echo`.",
      "zh": "Gleam 没有叫 `print` 的函数——请使用 `io.println` 或 `echo`。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u02-functions-pipes",
  "id": "l05-fn-def",
  "title": {
   "ko": "함수 정의와 타입 표기",
   "en": "Function Definitions and Type Annotations",
   "zh": "函数定义与类型标注"
  },
  "tags": [
   "concept:basics"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "함수는 `pub fn 이름(인자: 타입) -> 반환타입 { 본문 }` 모양으로 정의합니다.\n\n예: `pub fn double(x: Int) -> Int { x * 2 }`\n\n인자마다 타입을 적고, `->` 뒤에 반환 타입을 적습니다. 타입 표기는 컴파일러가 추론해줄 때도 많지만, 함수의 '계약서' 역할을 하므로 top-level 함수에는 늘 붙이는 것이 관용입니다.",
     "en": "A function is defined in the shape `pub fn name(arg: Type) -> ReturnType { body }`.\n\nExample: `pub fn double(x: Int) -> Int { x * 2 }`\n\nYou write a type for each argument, and the return type after `->`. The compiler can often infer types for you, but since annotations act as the function's 'contract', the convention is to always add them to top-level functions.",
     "zh": "函数按 `pub fn 名称(参数: 类型) -> 返回类型 { 函数体 }` 的形式定义。\n\n例如：`pub fn double(x: Int) -> Int { x * 2 }`\n\n每个参数都要写上类型，`->` 后面写返回类型。很多时候编译器能帮你推断类型，但类型标注起着函数“契约”的作用，所以惯例是顶层函数总要写上。"
    }
   },
   {
    "kind": "exercise",
    "id": "return-type",
    "type": "choice",
    "prompt": {
     "ko": "`pub fn double(x: Int) -> ??? { x * 2 }` 에서 `???`에 올 반환 타입은?",
     "en": "In `pub fn double(x: Int) -> ??? { x * 2 }`, what return type belongs in place of `???`?",
     "zh": "在 `pub fn double(x: Int) -> ??? { x * 2 }` 中，`???` 处应该填什么返回类型？"
    },
    "choices": [
     {
      "ko": "`Int`",
      "en": "`Int`",
      "zh": "`Int`"
     },
     {
      "ko": "`Float`",
      "en": "`Float`",
      "zh": "`Float`"
     },
     {
      "ko": "`String`",
      "en": "`String`",
      "zh": "`String`"
     },
     {
      "ko": "`Bool`",
      "en": "`Bool`",
      "zh": "`Bool`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! `*`는 Int 연산자이고, Int * Int의 결과는 Int입니다.",
     "en": "Correct! `*` is the Int operator, and Int * Int yields an Int.",
     "zh": "没错！`*` 是 Int 运算符，Int * Int 的结果是 Int。"
    },
    "feedback": {
     "1": {
      "ko": "`*`는 Int 연산자예요. Float였다면 `*.`와 `2.0`이 필요합니다.",
      "en": "`*` is the Int operator. For Floats you'd need `*.` and `2.0`.",
      "zh": "`*` 是 Int 运算符。如果是 Float，就需要 `*.` 和 `2.0`。"
     },
     "2": {
      "ko": "숫자 곱셈의 결과가 문자열이 될 수는 없어요.",
      "en": "A numeric multiplication can't produce a string.",
      "zh": "数字相乘的结果不可能是字符串。"
     },
     "3": {
      "ko": "곱셈 결과는 참/거짓이 아니라 수입니다.",
      "en": "The result of multiplication is a number, not true/false.",
      "zh": "乘法的结果是数，而不是真/假。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "no-return",
    "markdown": {
     "ko": "Gleam에는 `return` 키워드가 **없습니다**. 함수 본문의 **마지막 표현식**이 곧 반환값입니다.\n\n```gleam\npub fn double(x: Int) -> Int {\n  x * 2\n}\n```\n\n`x * 2`가 마지막 표현식이므로 그대로 반환됩니다. 중간에 빠져나가는 early return도 없습니다 — 이는 뒤 유닛의 case 분기 사고로 이어지는 복선입니다.",
     "en": "Gleam has **no** `return` keyword. The **last expression** in a function body is its return value.\n\n```gleam\npub fn double(x: Int) -> Int {\n  x * 2\n}\n```\n\nSince `x * 2` is the last expression, it is returned as-is. There's also no early return that bails out partway through — this foreshadows the case-branch mindset you'll meet in a later unit.",
     "zh": "Gleam **没有** `return` 关键字。函数体的**最后一个表达式**就是返回值。\n\n```gleam\npub fn double(x: Int) -> Int {\n  x * 2\n}\n```\n\n`x * 2` 是最后一个表达式，所以它会被原样返回。也没有中途跳出的提前返回（early return）——这也为后面单元里“用 case 分支来思考”的方式埋下了伏笔。"
    }
   },
   {
    "kind": "exercise",
    "id": "last-expr",
    "type": "predict",
    "prompt": {
     "ko": "`double(21)`의 값은? (`fn double(x: Int) -> Int { x * 2 }`)",
     "en": "What is the value of `double(21)`? (`fn double(x: Int) -> Int { x * 2 }`)",
     "zh": "`double(21)` 的值是多少？（`fn double(x: Int) -> Int { x * 2 }`）"
    },
    "code": {
     "ko": "pub fn double(x: Int) -> Int {\n  x * 2\n}\n\n// double(21) 은?",
     "en": "pub fn double(x: Int) -> Int {\n  x * 2\n}\n\n// double(21) is?",
     "zh": "pub fn double(x: Int) -> Int {\n  x * 2\n}\n\n// double(21) 是多少？"
    },
    "choices": [
     {
      "ko": "`42`",
      "en": "`42`",
      "zh": "`42`"
     },
     {
      "ko": "`21`",
      "en": "`21`",
      "zh": "`21`"
     },
     {
      "ko": "`23`",
      "en": "`23`",
      "zh": "`23`"
     },
     {
      "ko": "`2`",
      "en": "`2`",
      "zh": "`2`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "정확해요! 마지막 표현식 `x * 2` = 21 * 2 = 42가 그대로 반환됩니다.",
     "en": "Exactly! The last expression `x * 2` = 21 * 2 = 42 is returned as-is.",
     "zh": "完全正确！最后一个表达式 `x * 2` = 21 * 2 = 42 被原样返回。"
    },
    "feedback": {
     "1": {
      "ko": "입력 그대로가 아니라 `x * 2`가 반환돼요 — 21 * 2 = 42.",
      "en": "It returns `x * 2`, not the input unchanged — 21 * 2 = 42.",
      "zh": "返回的不是原样的输入，而是 `x * 2`——21 * 2 = 42。"
     },
     "2": {
      "ko": "`x * 2`는 곱셈이지 덧셈이 아니에요. 21 * 2 = 42.",
      "en": "`x * 2` is multiplication, not addition. 21 * 2 = 42.",
      "zh": "`x * 2` 是乘法，不是加法。21 * 2 = 42。"
     },
     "3": {
      "ko": "`2`는 곱하는 수일 뿐, 반환값은 `x * 2` = 42입니다.",
      "en": "`2` is just the multiplier; the return value is `x * 2` = 42.",
      "zh": "`2` 只是乘数，返回值是 `x * 2` = 42。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "return-keyword",
    "type": "choice",
    "prompt": {
     "ko": "Gleam 함수에서 값을 돌려주는 방식으로 옳은 것은?",
     "en": "Which is the correct way a Gleam function returns a value?",
     "zh": "Gleam 函数返回值的正确方式是哪一个？"
    },
    "choices": [
     {
      "ko": "`return x` 처럼 return 키워드를 쓴다",
      "en": "You use a return keyword, like `return x`",
      "zh": "像 `return x` 这样使用 return 关键字"
     },
     {
      "ko": "본문의 마지막 표현식이 자동으로 반환값이 된다",
      "en": "The last expression in the body automatically becomes the return value",
      "zh": "函数体的最后一个表达式自动成为返回值"
     },
     {
      "ko": "`yield x` 로 반환한다",
      "en": "You return with `yield x`",
      "zh": "用 `yield x` 返回"
     },
     {
      "ko": "함수 이름에 값을 대입한다",
      "en": "You assign the value to the function's name",
      "zh": "把值赋给函数名"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! Gleam엔 return이 없고, 마지막 표현식이 곧 반환값입니다.",
     "en": "Correct! Gleam has no return; the last expression is the return value.",
     "zh": "没错！Gleam 没有 return，最后一个表达式就是返回值。"
    },
    "feedback": {
     "0": {
      "ko": "Gleam에는 `return` 키워드 자체가 없습니다.",
      "en": "Gleam has no `return` keyword at all.",
      "zh": "Gleam 根本没有 `return` 关键字。"
     },
     "2": {
      "ko": "`yield`는 Gleam 문법이 아니에요.",
      "en": "`yield` is not Gleam syntax.",
      "zh": "`yield` 不是 Gleam 的语法。"
     },
     "3": {
      "ko": "함수 이름에 대입하는 방식은 Gleam에 없습니다 — 마지막 표현식이 반환값.",
      "en": "Assigning to the function name doesn't exist in Gleam — the last expression is the return value.",
      "zh": "Gleam 没有给函数名赋值这种方式——最后一个表达式就是返回值。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u02-functions-pipes",
  "id": "l06-pipe",
  "title": {
   "ko": "파이프 |>",
   "en": "The Pipe |>",
   "zh": "管道 |>"
  },
  "tags": [
   "concept:pipe-operator",
   "concept:strings"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "`|>`(파이프) 연산자는 왼쪽 값을 오른쪽 함수의 **첫 번째 인자**로 넣어줍니다.\n\n`x |> f`  는  `f(x)`  와 같고,\n`x |> f(y)`  는  `f(x, y)`  와 같습니다. (왼쪽 값이 맨 앞 자리에 들어갑니다!)\n\n데이터가 왼쪽에서 오른쪽으로, 변환되는 순서대로 흐르는 것이 핵심입니다.",
     "en": "The `|>` (pipe) operator feeds the value on the left into the **first argument** of the function on the right.\n\n`x |> f`  is the same as  `f(x)`,\nand `x |> f(y)`  is the same as  `f(x, y)`. (The left-hand value goes into the very first slot!)\n\nThe key idea is that data flows left to right, in the order it's transformed.",
     "zh": "`|>`（管道）运算符会把左边的值作为右边函数的**第一个参数**传进去。\n\n`x |> f`  等同于  `f(x)`，\n`x |> f(y)`  等同于  `f(x, y)`。（左边的值放在最前面的位置！）\n\n关键在于：数据按照被转换的顺序，从左往右流动。"
    }
   },
   {
    "kind": "exercise",
    "id": "trim-upper",
    "type": "predict",
    "prompt": {
     "ko": "이 파이프 체인의 값은?",
     "en": "What is the value of this pipe chain?",
     "zh": "这条管道链的值是什么？"
    },
    "code": {
     "ko": "\"  lucy \"\n|> string.trim\n|> string.uppercase",
     "en": "\"  lucy \"\n|> string.trim\n|> string.uppercase",
     "zh": "\"  lucy \"\n|> string.trim\n|> string.uppercase"
    },
    "choices": [
     {
      "ko": "`\"LUCY\"`",
      "en": "`\"LUCY\"`",
      "zh": "`\"LUCY\"`"
     },
     {
      "ko": "`\"  LUCY \"`",
      "en": "`\"  LUCY \"`",
      "zh": "`\"  LUCY \"`"
     },
     {
      "ko": "`\"lucy\"`",
      "en": "`\"lucy\"`",
      "zh": "`\"lucy\"`"
     },
     {
      "ko": "`\"  lucy \"`",
      "en": "`\"  lucy \"`",
      "zh": "`\"  lucy \"`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! 먼저 trim으로 공백을 없애 \"lucy\", 그 다음 uppercase로 \"LUCY\".",
     "en": "Correct! First trim removes the whitespace to give \"lucy\", then uppercase makes it \"LUCY\".",
     "zh": "没错！先用 trim 去掉空白得到 \"lucy\"，再用 uppercase 得到 \"LUCY\"。"
    },
    "feedback": {
     "1": {
      "ko": "trim이 양 끝 공백을 먼저 제거해요. 공백이 남지 않습니다.",
      "en": "trim strips the whitespace at both ends first. None is left over.",
      "zh": "trim 会先去掉两端的空白，不会留下空格。"
     },
     "2": {
      "ko": "uppercase가 대문자로 바꿔요 — 소문자로 남지 않습니다.",
      "en": "uppercase converts to capitals — it doesn't stay lowercase.",
      "zh": "uppercase 会转换成大写——不会保持小写。"
     },
     "3": {
      "ko": "두 변환 모두 적용됩니다 — trim과 uppercase를 거칩니다.",
      "en": "Both transformations apply — it goes through trim and uppercase.",
      "zh": "两个转换都会生效——要经过 trim 和 uppercase。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "first-arg",
    "markdown": {
     "ko": "파이프가 값을 **첫 번째 인자**에 넣는다는 점이 가장 헷갈리는 부분입니다.\n\n`string.append(첫째, 둘째)`는 `첫째` 뒤에 `둘째`를 이어붙입니다.\n그래서 `\"LUCY\" |> string.append(\"!\")` 는 `string.append(\"LUCY\", \"!\")` 가 되어 `\"LUCY!\"`가 됩니다 — `\"LUCY\"`가 첫 인자, `\"!\"`가 둘째 인자입니다.",
     "en": "The most confusing part is that the pipe places the value into the **first argument**.\n\n`string.append(first, second)` appends `second` after `first`.\nSo `\"LUCY\" |> string.append(\"!\")` becomes `string.append(\"LUCY\", \"!\")`, producing `\"LUCY!\"` — `\"LUCY\"` is the first argument and `\"!\"` is the second.",
     "zh": "最容易混淆的一点是：管道会把值放进**第一个参数**。\n\n`string.append(first, second)` 会把 `second` 接在 `first` 后面。\n所以 `\"LUCY\" |> string.append(\"!\")` 就是 `string.append(\"LUCY\", \"!\")`，结果是 `\"LUCY!\"`——`\"LUCY\"` 是第一个参数，`\"!\"` 是第二个参数。"
    }
   },
   {
    "kind": "exercise",
    "id": "append-pipe",
    "type": "predict",
    "prompt": {
     "ko": "이 표현식의 값은?",
     "en": "What is the value of this expression?",
     "zh": "这个表达式的值是什么？"
    },
    "code": {
     "ko": "\"LUCY\" |> string.append(\"!\")",
     "en": "\"LUCY\" |> string.append(\"!\")",
     "zh": "\"LUCY\" |> string.append(\"!\")"
    },
    "choices": [
     {
      "ko": "`\"LUCY!\"`",
      "en": "`\"LUCY!\"`",
      "zh": "`\"LUCY!\"`"
     },
     {
      "ko": "`\"!LUCY\"`",
      "en": "`\"!LUCY\"`",
      "zh": "`\"!LUCY\"`"
     },
     {
      "ko": "`\"LUCY\"`",
      "en": "`\"LUCY\"`",
      "zh": "`\"LUCY\"`"
     },
     {
      "ko": "컴파일 에러",
      "en": "Compile error",
      "zh": "编译错误"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "정확해요! 파이프가 \"LUCY\"를 첫 인자에 넣어 string.append(\"LUCY\", \"!\") → \"LUCY!\".",
     "en": "Exactly! The pipe puts \"LUCY\" into the first argument: string.append(\"LUCY\", \"!\") → \"LUCY!\".",
     "zh": "完全正确！管道把 \"LUCY\" 放进第一个参数，即 string.append(\"LUCY\", \"!\") → \"LUCY!\"。"
    },
    "feedback": {
     "1": {
      "ko": "파이프는 왼쪽 값을 **첫째** 인자에 넣어요. `append(\"LUCY\", \"!\")`라서 `!`가 뒤에 붙습니다.",
      "en": "The pipe puts the left value into the **first** argument. It's `append(\"LUCY\", \"!\")`, so `!` is appended at the end.",
      "zh": "管道把左边的值放进**第一个**参数。这是 `append(\"LUCY\", \"!\")`，所以 `!` 接在后面。"
     },
     "2": {
      "ko": "`\"!\"`가 인자로 더해지므로 그대로가 아니라 \"LUCY!\"가 됩니다.",
      "en": "`\"!\"` is added as an argument, so it doesn't stay unchanged — it becomes \"LUCY!\".",
      "zh": "`\"!\"` 作为参数被拼接上去，所以不会保持原样，而是变成 \"LUCY!\"。"
     },
     "3": {
      "ko": "올바른 파이프 호출이라 컴파일됩니다.",
      "en": "It's a valid pipe call, so it compiles.",
      "zh": "这是合法的管道调用，可以编译。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "pipe-meaning",
    "type": "choice",
    "prompt": {
     "ko": "`x |> f(y)` 는 무엇과 같은가요?",
     "en": "What is `x |> f(y)` the same as?",
     "zh": "`x |> f(y)` 等同于什么？"
    },
    "choices": [
     {
      "ko": "`f(y, x)`",
      "en": "`f(y, x)`",
      "zh": "`f(y, x)`"
     },
     {
      "ko": "`f(x, y)`",
      "en": "`f(x, y)`",
      "zh": "`f(x, y)`"
     },
     {
      "ko": "`f(x)(y)`",
      "en": "`f(x)(y)`",
      "zh": "`f(x)(y)`"
     },
     {
      "ko": "`x(f, y)`",
      "en": "`x(f, y)`",
      "zh": "`x(f, y)`"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "맞아요! 파이프는 왼쪽 값 x를 첫 인자로 넣어 `f(x, y)`가 됩니다.",
     "en": "Correct! The pipe puts the left value x into the first argument, giving `f(x, y)`.",
     "zh": "没错！管道把左边的值 x 放进第一个参数，得到 `f(x, y)`。"
    },
    "feedback": {
     "0": {
      "ko": "x는 **첫째** 인자로 들어가요 — `f(x, y)`이지 `f(y, x)`가 아닙니다.",
      "en": "x goes into the **first** argument — it's `f(x, y)`, not `f(y, x)`.",
      "zh": "x 进入的是**第一个**参数——是 `f(x, y)`，不是 `f(y, x)`。"
     },
     "2": {
      "ko": "Gleam엔 커링이 없어요 — `f(x)(y)` 형태가 아닙니다.",
      "en": "Gleam has no currying — there's no `f(x)(y)` form.",
      "zh": "Gleam 没有柯里化——不是 `f(x)(y)` 这种形式。"
     },
     "3": {
      "ko": "f가 함수이고 x가 그 첫 인자입니다 — x가 f를 호출하지 않아요.",
      "en": "f is the function and x is its first argument — x doesn't call f.",
      "zh": "f 是函数，x 是它的第一个参数——不是 x 调用 f。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u02-functions-pipes",
  "id": "l07-nested-to-pipe",
  "title": {
   "ko": "중첩 호출을 파이프로",
   "en": "Turning Nested Calls into Pipes",
   "zh": "把嵌套调用改写成管道"
  },
  "tags": [
   "concept:pipe-operator",
   "concept:strings"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "`c(b(a(x)))` 같은 중첩 호출은 **안쪽부터** 읽어야 합니다 — a 먼저, 그다음 b, 그다음 c. 읽는 순서와 실행 순서가 거꾸로죠.\n\n파이프로 바꾸면 `x |> a |> b |> c` 가 되어 **데이터가 변환되는 순서 그대로** 읽힙니다. 두 표현식은 완전히 같은 값을 냅니다.",
     "en": "A nested call like `c(b(a(x)))` must be read **from the inside out** — a first, then b, then c. The reading order is the reverse of the execution order.\n\nRewriting it as a pipe gives `x |> a |> b |> c`, which reads **in the exact order the data is transformed**. The two expressions produce exactly the same value.",
     "zh": "像 `c(b(a(x)))` 这样的嵌套调用必须**从里往外**读——先 a，再 b，再 c。阅读顺序和执行顺序正好相反。\n\n改写成管道后就是 `x |> a |> b |> c`，**完全按照数据被转换的顺序**来读。两个表达式产生的值完全相同。"
    }
   },
   {
    "kind": "exercise",
    "id": "nested-value",
    "type": "predict",
    "prompt": {
     "ko": "이 중첩 호출의 값은?",
     "en": "What is the value of this nested call?",
     "zh": "这个嵌套调用的值是什么？"
    },
    "code": {
     "ko": "string.uppercase(string.trim(\"  hi \"))",
     "en": "string.uppercase(string.trim(\"  hi \"))",
     "zh": "string.uppercase(string.trim(\"  hi \"))"
    },
    "choices": [
     {
      "ko": "`\"HI\"`",
      "en": "`\"HI\"`",
      "zh": "`\"HI\"`"
     },
     {
      "ko": "`\"  HI \"`",
      "en": "`\"  HI \"`",
      "zh": "`\"  HI \"`"
     },
     {
      "ko": "`\"hi\"`",
      "en": "`\"hi\"`",
      "zh": "`\"hi\"`"
     },
     {
      "ko": "`\"  hi \"`",
      "en": "`\"  hi \"`",
      "zh": "`\"  hi \"`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! 안쪽 trim이 \"hi\"를 만들고, 바깥 uppercase가 \"HI\"로 바꿉니다.",
     "en": "Correct! The inner trim produces \"hi\", and the outer uppercase turns it into \"HI\".",
     "zh": "没错！里层的 trim 得到 \"hi\"，外层的 uppercase 把它变成 \"HI\"。"
    },
    "feedback": {
     "1": {
      "ko": "안쪽 trim이 먼저 공백을 제거해요 — 공백이 남지 않습니다.",
      "en": "The inner trim removes the whitespace first — none is left over.",
      "zh": "里层的 trim 会先去掉空白——不会留下空格。"
     },
     "2": {
      "ko": "바깥 uppercase가 대문자로 바꿔요.",
      "en": "The outer uppercase converts to capitals.",
      "zh": "外层的 uppercase 会转换成大写。"
     },
     "3": {
      "ko": "두 함수가 모두 적용돼 \"HI\"가 됩니다.",
      "en": "Both functions apply, producing \"HI\".",
      "zh": "两个函数都会生效，结果是 \"HI\"。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "equivalence",
    "markdown": {
     "ko": "위의 `string.uppercase(string.trim(\"  hi \"))` 는 파이프로 이렇게 씁니다:\n\n```gleam\n\"  hi \"\n|> string.trim\n|> string.uppercase\n```\n\n같은 값(\"HI\")을 내지만, 가장 먼저 일어나는 일(trim)이 가장 위에 옵니다.",
     "en": "The `string.uppercase(string.trim(\"  hi \"))` above is written with pipes like this:\n\n```gleam\n\"  hi \"\n|> string.trim\n|> string.uppercase\n```\n\nIt yields the same value (\"HI\"), but the thing that happens first (trim) comes at the top.",
     "zh": "上面的 `string.uppercase(string.trim(\"  hi \"))` 用管道可以这样写：\n\n```gleam\n\"  hi \"\n|> string.trim\n|> string.uppercase\n```\n\n得到的值相同（\"HI\"），但最先发生的事情（trim）出现在最上面。"
    }
   },
   {
    "kind": "exercise",
    "id": "rewrite",
    "type": "choice",
    "prompt": {
     "ko": "`c(b(a(x)))` 를 파이프로 올바르게 옮긴 것은?",
     "en": "Which correctly rewrites `c(b(a(x)))` as a pipe?",
     "zh": "把 `c(b(a(x)))` 正确改写成管道的是哪一个？"
    },
    "choices": [
     {
      "ko": "`x |> a |> b |> c`",
      "en": "`x |> a |> b |> c`",
      "zh": "`x |> a |> b |> c`"
     },
     {
      "ko": "`x |> c |> b |> a`",
      "en": "`x |> c |> b |> a`",
      "zh": "`x |> c |> b |> a`"
     },
     {
      "ko": "`c |> b |> a |> x`",
      "en": "`c |> b |> a |> x`",
      "zh": "`c |> b |> a |> x`"
     },
     {
      "ko": "`a |> b |> c |> x`",
      "en": "`a |> b |> c |> x`",
      "zh": "`a |> b |> c |> x`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "정확해요! 안쪽(가장 먼저 실행되는) a가 가장 앞에 오고, 바깥 c가 마지막입니다.",
     "en": "Exactly! The innermost (first-executed) a comes first, and the outer c comes last.",
     "zh": "完全正确！最里层（最先执行）的 a 排在最前面，最外层的 c 排在最后。"
    },
    "feedback": {
     "1": {
      "ko": "순서가 뒤집혔어요 — 가장 안쪽 a가 가장 먼저 와야 합니다.",
      "en": "The order is reversed — the innermost a should come first.",
      "zh": "顺序反了——最里层的 a 应该排在最前面。"
     },
     "2": {
      "ko": "x는 시작 데이터라 맨 앞에 와야 해요.",
      "en": "x is the starting data, so it must come at the front.",
      "zh": "x 是起始数据，必须放在最前面。"
     },
     "3": {
      "ko": "x는 함수가 아니라 흘려보낼 값이라 맨 앞에 둡니다.",
      "en": "x is not a function but the value to flow through, so it goes at the front.",
      "zh": "x 不是函数，而是要流经管道的值，所以放在最前面。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "shout-chain",
    "type": "predict",
    "prompt": {
     "ko": "함수 `shout`이 아래처럼 정의됐을 때 `shout(\"  lucy \")`의 값은?",
     "en": "Given the function `shout` defined below, what is the value of `shout(\"  lucy \")`?",
     "zh": "函数 `shout` 定义如下，`shout(\"  lucy \")` 的值是什么？"
    },
    "code": {
     "ko": "pub fn shout(name: String) -> String {\n  name\n  |> string.trim\n  |> string.uppercase\n  |> string.append(\"!\")\n}\n\n// shout(\"  lucy \") 은?",
     "en": "pub fn shout(name: String) -> String {\n  name\n  |> string.trim\n  |> string.uppercase\n  |> string.append(\"!\")\n}\n\n// shout(\"  lucy \") is?",
     "zh": "pub fn shout(name: String) -> String {\n  name\n  |> string.trim\n  |> string.uppercase\n  |> string.append(\"!\")\n}\n\n// shout(\"  lucy \") 是多少？"
    },
    "choices": [
     {
      "ko": "`\"LUCY!\"`",
      "en": "`\"LUCY!\"`",
      "zh": "`\"LUCY!\"`"
     },
     {
      "ko": "`\"!LUCY\"`",
      "en": "`\"!LUCY\"`",
      "zh": "`\"!LUCY\"`"
     },
     {
      "ko": "`\"  LUCY !\"`",
      "en": "`\"  LUCY !\"`",
      "zh": "`\"  LUCY !\"`"
     },
     {
      "ko": "`\"lucy!\"`",
      "en": "`\"lucy!\"`",
      "zh": "`\"lucy!\"`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! trim→\"lucy\", uppercase→\"LUCY\", append(\"!\")→\"LUCY!\".",
     "en": "Correct! trim→\"lucy\", uppercase→\"LUCY\", append(\"!\")→\"LUCY!\".",
     "zh": "没错！trim→\"lucy\"，uppercase→\"LUCY\"，append(\"!\")→\"LUCY!\"。"
    },
    "feedback": {
     "1": {
      "ko": "append는 뒤에 붙여요 — \"LUCY\" 다음에 \"!\"라서 \"LUCY!\"입니다.",
      "en": "append adds to the end — \"!\" comes after \"LUCY\", so it's \"LUCY!\".",
      "zh": "append 是接在后面——\"!\" 跟在 \"LUCY\" 之后，所以是 \"LUCY!\"。"
     },
     "2": {
      "ko": "trim이 공백을 먼저 없애므로 공백이 남지 않아요.",
      "en": "trim removes the whitespace first, so none is left over.",
      "zh": "trim 会先去掉空白，所以不会留下空格。"
     },
     "3": {
      "ko": "uppercase 단계가 대문자로 바꿉니다 — 소문자로 남지 않아요.",
      "en": "The uppercase step converts to capitals — it doesn't stay lowercase.",
      "zh": "uppercase 这一步会转换成大写——不会保持小写。"
     }
    }
   }
  ]
 },
 {
  "unitId": "u02-functions-pipes",
  "id": "l08-pipe-first",
  "title": {
   "ko": "파이프 우선 스타일과 한계",
   "en": "Pipe-First Style and Its Limits",
   "zh": "管道优先风格及其局限"
  },
  "tags": [
   "concept:pipe-operator",
   "concept:strings"
  ],
  "blocks": [
   {
    "kind": "prose",
    "id": "intro",
    "markdown": {
     "ko": "Gleam stdlib는 '파이프하기 좋게' 설계되어, 변환할 **데이터를 첫 번째 인자**로 받는 경우가 많습니다. 그래서 `string.trim`, `string.uppercase`, `string.replace`, `string.append` 모두 자연스럽게 파이프됩니다.\n\n`string.replace(문자열, 찾을것, 바꿀것)` 도 문자열이 첫 인자라 파이프에 잘 맞습니다.",
     "en": "The Gleam stdlib is designed to be 'pipe-friendly', so it often takes the **data to be transformed as the first argument**. That's why `string.trim`, `string.uppercase`, `string.replace`, and `string.append` all pipe naturally.\n\n`string.replace(string, what_to_find, what_to_replace_with)` also takes the string first, so it fits pipes well.",
     "zh": "Gleam 标准库在设计时就考虑了“方便用管道”，很多函数都把要转换的**数据作为第一个参数**。所以 `string.trim`、`string.uppercase`、`string.replace`、`string.append` 都能自然地用在管道中。\n\n`string.replace(字符串, 要查找的, 替换成)` 也是字符串作为第一个参数，所以很适合管道。"
    }
   },
   {
    "kind": "exercise",
    "id": "replace-pipe",
    "type": "predict",
    "prompt": {
     "ko": "이 표현식의 값은? (`string.replace`는 첫 인자 문자열에서 둘째를 셋째로 바꿉니다)",
     "en": "What is the value of this expression? (`string.replace` replaces the second argument with the third within the first-argument string)",
     "zh": "这个表达式的值是什么？（`string.replace` 会在第一个参数的字符串中，把第二个参数替换成第三个参数）"
    },
    "code": {
     "ko": "\"a-b-c\" |> string.replace(\"-\", \" \")",
     "en": "\"a-b-c\" |> string.replace(\"-\", \" \")",
     "zh": "\"a-b-c\" |> string.replace(\"-\", \" \")"
    },
    "choices": [
     {
      "ko": "`\"a b c\"`",
      "en": "`\"a b c\"`",
      "zh": "`\"a b c\"`"
     },
     {
      "ko": "`\"a-b-c\"`",
      "en": "`\"a-b-c\"`",
      "zh": "`\"a-b-c\"`"
     },
     {
      "ko": "`\"abc\"`",
      "en": "`\"abc\"`",
      "zh": "`\"abc\"`"
     },
     {
      "ko": "`\"- -\"`",
      "en": "`\"- -\"`",
      "zh": "`\"- -\"`"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! \"a-b-c\"에서 모든 \"-\"를 \" \"로 바꿔 \"a b c\".",
     "en": "Correct! In \"a-b-c\", every \"-\" is replaced with \" \", giving \"a b c\".",
     "zh": "没错！把 \"a-b-c\" 中所有的 \"-\" 替换成 \" \"，得到 \"a b c\"。"
    },
    "feedback": {
     "1": {
      "ko": "replace가 적용되므로 그대로 남지 않아요 — \"-\"가 공백이 됩니다.",
      "en": "replace is applied, so it doesn't stay unchanged — each \"-\" becomes a space.",
      "zh": "replace 生效了，所以不会保持原样——每个 \"-\" 都变成了空格。"
     },
     "2": {
      "ko": "\"-\"를 빈 문자열이 아니라 공백 \" \"으로 바꿔요.",
      "en": "It replaces \"-\" with a space \" \", not with an empty string.",
      "zh": "\"-\" 被替换成空格 \" \"，而不是空字符串。"
     },
     "3": {
      "ko": "글자 a,b,c는 그대로 남고 구분자만 바뀝니다.",
      "en": "The letters a, b, c stay; only the separators change.",
      "zh": "字母 a、b、c 保持不变，只有分隔符被替换。"
     }
    }
   },
   {
    "kind": "prose",
    "id": "limits",
    "markdown": {
     "ko": "파이프 우선 스타일에도 한계가 있습니다. 파이프는 왼쪽 값을 **첫 번째** 인자에만 넣을 수 있어요. 만약 흘려보내는 값이 둘째·셋째 인자 자리에 들어가야 한다면 파이프만으로는 안 됩니다.\n\n그럴 땐 함수 캡처(`f(고정값, _)`)나 익명 함수를 쓰는데, 이는 뒤 유닛에서 배웁니다. 지금은 '파이프는 첫 인자 전용'이라는 한계만 기억하세요.",
     "en": "Pipe-first style has its limits too. The pipe can only place the left value into the **first** argument. If the value being flowed through needs to go into the second or third argument slot, the pipe alone won't do.\n\nIn those cases you use a function capture (`f(fixed_value, _)`) or an anonymous function, which you'll learn in a later unit. For now, just remember the limit: 'the pipe is first-argument-only'.",
     "zh": "管道优先风格也有局限。管道只能把左边的值放进**第一个**参数。如果沿管道传下去的值需要放在第二个、第三个参数的位置，光靠管道是做不到的。\n\n这时要用函数捕获（`f(固定值, _)`）或匿名函数，这些会在后面的单元中学习。现在只要记住这个局限：“管道只能用于第一个参数”。"
    }
   },
   {
    "kind": "exercise",
    "id": "pipe-limit",
    "type": "choice",
    "prompt": {
     "ko": "파이프 `|>`의 한계로 옳은 설명은?",
     "en": "Which correctly describes a limit of the pipe `|>`?",
     "zh": "关于管道 `|>` 的局限，哪个说法是正确的？"
    },
    "choices": [
     {
      "ko": "왼쪽 값을 항상 첫 번째 인자에만 넣을 수 있다",
      "en": "It can only ever put the left value into the first argument",
      "zh": "左边的值永远只能放进第一个参数"
     },
     {
      "ko": "한 번에 두 개까지만 연결할 수 있다",
      "en": "It can chain at most two things at a time",
      "zh": "一次最多只能连接两个"
     },
     {
      "ko": "Int에는 쓸 수 없다",
      "en": "It can't be used with Int",
      "zh": "不能用于 Int"
     },
     {
      "ko": "함수가 인자를 하나만 받아야 쓸 수 있다",
      "en": "It can only be used when the function takes exactly one argument",
      "zh": "只有函数恰好接收一个参数时才能使用"
     }
    ],
    "answer": 0,
    "correct": {
     "ko": "맞아요! 파이프는 왼쪽 값을 첫 인자에만 넣습니다. 다른 자리면 캡처가 필요해요.",
     "en": "Correct! The pipe only puts the left value into the first argument. For other slots you need a capture.",
     "zh": "没错！管道只会把左边的值放进第一个参数。要放到其他位置，就需要函数捕获。"
    },
    "feedback": {
     "1": {
      "ko": "연결 개수에 제한은 없어요 — 얼마든지 이어 쓸 수 있습니다.",
      "en": "There's no limit on how many you can chain — you can keep linking as many as you like.",
      "zh": "连接的数量没有限制——想接多少个都可以。"
     },
     "2": {
      "ko": "타입과 무관해요 — 어떤 값이든 파이프할 수 있습니다.",
      "en": "It's independent of type — you can pipe any value.",
      "zh": "与类型无关——任何值都可以用管道传递。"
     },
     "3": {
      "ko": "인자가 여러 개여도 됩니다 — 나머지를 호출에 적어주면 됩니다(`f(_)` 형태 등).",
      "en": "Multiple arguments are fine — you just write the rest in the call (e.g. the `f(_)` form).",
      "zh": "有多个参数也没问题——把其余参数写在调用里就行（例如 `f(_)` 这种形式）。"
     }
    }
   },
   {
    "kind": "exercise",
    "id": "non-first-arg",
    "type": "choice",
    "prompt": {
     "ko": "흘려보낼 값이 함수의 **두 번째** 인자 자리에 들어가야 한다면 어떻게 할까요?",
     "en": "What do you do if the value to flow through needs to go into the function's **second** argument slot?",
     "zh": "如果沿管道传下去的值需要放在函数**第二个**参数的位置，该怎么办？"
    },
    "choices": [
     {
      "ko": "파이프만으로 충분하다",
      "en": "The pipe alone is enough",
      "zh": "光靠管道就够了"
     },
     {
      "ko": "함수 캡처 `f(고정값, _)`나 익명 함수가 필요하다",
      "en": "You need a function capture `f(fixed_value, _)` or an anonymous function",
      "zh": "需要用函数捕获 `f(固定值, _)` 或匿名函数"
     },
     {
      "ko": "불가능하므로 그 함수는 쓸 수 없다",
      "en": "It's impossible, so you can't use that function",
      "zh": "做不到，所以不能使用那个函数"
     },
     {
      "ko": "인자 순서를 자동으로 바꿔준다",
      "en": "It automatically reorders the arguments for you",
      "zh": "会自动调整参数顺序"
     }
    ],
    "answer": 1,
    "correct": {
     "ko": "정확해요! 파이프는 첫 인자 전용이라, 다른 자리는 캡처나 익명 함수로 처리합니다.",
     "en": "Exactly! The pipe is first-argument-only, so other slots are handled with a capture or an anonymous function.",
     "zh": "完全正确！管道只能用于第一个参数，其他位置要用函数捕获或匿名函数来处理。"
    },
    "feedback": {
     "0": {
      "ko": "파이프는 첫 인자에만 넣어요 — 둘째 자리엔 부족합니다.",
      "en": "The pipe only puts it into the first argument — that's not enough for the second slot.",
      "zh": "管道只会放进第一个参数——对第二个位置来说不够用。"
     },
     "2": {
      "ko": "쓸 수 있어요 — 캡처/익명 함수로 자리를 맞추면 됩니다.",
      "en": "You can use it — line up the slot with a capture or an anonymous function.",
      "zh": "可以使用——用函数捕获或匿名函数把位置对上就行。"
     },
     "3": {
      "ko": "Gleam은 인자 순서를 자동으로 바꾸지 않습니다.",
      "en": "Gleam does not automatically reorder arguments.",
      "zh": "Gleam 不会自动调整参数顺序。"
     }
    }
   }
  ]
 }
];
