---
id: gleam-int-float
title: Int와 Float
language: gleam
source: { kind: original }
---
Gleam은 `Int`와 `Float`를 자동으로 바꾸지 않는다. 연산자도 따로 있다: `Int`는 `+ - * / %`,
`Float`는 `+. -. *. /.`와 `<.` 같은 비교를 쓴다.

| 식 | 결과 | 설명 |
|---|---|---|
| `7 / 2`, `-7 / 2` | `3`, `-3` | 정수 나눗셈은 0 쪽으로 버린다 |
| `-7 % 3` | `-1` | 나머지의 부호는 나누는 수가 아니라 나뉘는 수를 따른다 |
| `int.modulo(-7, 3)` | `Ok(2)` | 수학적 나머지 (0으로 나누면 `Error(Nil)`) |
| `5 / 0`, `5.0 /. 0.0` | `0`, `0.0` | 0으로 나눠도 예외 없이 0 |
| `int.divide(5, 0)` | `Error(Nil)` | 0 나눗셈을 명시적으로 다룰 때 |
| `int.to_float(3)` | `3.0` | Int → Float |
| `float.round(2.5)`, `float.truncate(2.7)` | `3`, `2` | Float → Int |
| `10_000` | `10000` | 자릿수 구분용 밑줄 |

```gleam
import gleam/int
import gleam/list

pub fn discount(price: Int, percent: Int) -> Int {
  price * percent / 100
}
// discount(10_000, 15) == 1500

pub fn average(xs: List(Int)) -> Float {
  case xs {
    [] -> 0.0
    _ -> int.to_float(int.sum(xs)) /. int.to_float(list.length(xs))
  }
}
// average([1, 2]) == 1.5
```

금액은 원 단위 `Int`로 다뤄야 `0.1 +. 0.2`처럼 이진 부동소수점에서 생기는 오차를 피할 수 있다. `Float`는 평균·비율처럼 소수가 꼭 필요한 곳에만 쓴다.

흔한 실수: 비율을 먼저 나눈다. `price * { percent / 100 }`는 `percent / 100`이 정수 나눗셈으로 `0`이 되어
항상 `0`이다. 곱셈을 먼저 하고 마지막에 나눈다.
