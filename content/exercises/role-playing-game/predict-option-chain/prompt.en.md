Predict the value that `main()` returns in the code below. Write your answer in Gleam tuple notation, for example `#(1, 2, 3)`.

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

`spell_power` doubles the mana to get the spell power, and returns `Some` only when that power is 10 or more.
