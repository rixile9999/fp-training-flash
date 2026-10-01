预测下面代码中 `main()` 返回的值。答案用 Gleam 元组写法填写，例如：`#(1, 2, 3)`

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

`spell_power` 把法力值翻倍得到法术威力，只有威力在 10 及以上时才返回 `Some`。
