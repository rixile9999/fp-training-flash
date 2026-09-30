아래 코드에서 `main()`이 반환하는 값을 예측하세요. 답은 Gleam 튜플 표기로 적습니다. 예: `#(1, 2, 3)`

```gleam
import gleam/option.{type Option, None, Some}

fn spell_power(mana: Option(Int)) -> Option(Int) {
  mana
  |> option.map(fn(m) { m * 2 })
  |> option.then(fn(power) {
    case power >= 10 {
      True -> Some(power)
      False -> None
    }
  })
}

pub fn main() {
  let a = spell_power(Some(8)) |> option.unwrap(0)
  let b = spell_power(Some(4)) |> option.unwrap(0)
  let c = spell_power(None) |> option.unwrap(-1)
  #(a, b, c)
}
```

`spell_power`는 마나를 두 배로 만든 주문 위력이 10 이상일 때만 `Some`을 돌려줍니다.
