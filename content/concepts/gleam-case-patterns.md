---
id: gleam-case-patterns
title: case와 패턴 매칭
language: gleam
source: { kind: original }
---
`case`는 값의 **모양**에 따라 분기하는 식이다. 위에서부터 처음 일치한 분기 하나만 실행되고, 그 분기의 값이
`case` 전체의 값이 된다. 컴파일러는 빠진 경우가 있으면 오류를 낸다.

| 패턴 | 예 | 일치하는 값 |
|---|---|---|
| 리터럴 | `0`, `"vip"` | 정확히 그 값 |
| 변수 / 무시 | `n`, `_` | 무엇이든 (변수는 이름을 붙인다) |
| 리스트 | `[]`, `[x]`, `[first, ..rest]` | 빈 목록, 한 개, 한 개 이상 |
| 튜플 | `#(a, 0)` | 두 번째가 `0`인 쌍 |
| 생성자 | `Ok(v)`, `Error(_)`, `Some(x)` | 해당 variant |
| 문자열 접두사 | `"#" <> rest` | `#`로 시작하는 문자열 |
| 대안 | `1 \| 2 \| 3` | 셋 중 하나 |
| 가드 | `n if n < 0` | 패턴이 맞고 조건도 `True` |

```gleam
import gleam/int

pub fn describe(xs: List(Int)) -> String {
  case xs {
    [] -> "비어 있음"
    [x] if x < 0 -> "음수 하나"
    [_] -> "하나"
    [first, ..] -> "첫 값 " <> int.to_string(first)
  }
}

// 여러 값을 한 번에 검사할 때는 쉼표로 나열한다.
pub fn shipping(region: String, weight: Int) -> Int {
  case region, weight {
    "jeju", _ | "ulleung", _ -> 5000
    _, w if w > 10 -> 4000
    _, _ -> 3000
  }
}
```

흔한 실수: 가드끼리 겹치는 분기의 순서를 잘못 둔다. `n if n > 0`을 `n if n > 100`보다 위에 두면 아래 분기는
절대 실행되지 않고, 가드가 있는 경우에는 컴파일러도 경고하지 않는다. 더 좁은 조건을 먼저 쓴다.
