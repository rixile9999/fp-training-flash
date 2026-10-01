找零时想用尽可能少的硬币。给定可用的硬币面额列表和要找零的金额，求出硬币枚数最少的组合。

```gleam
pub type ChangeError {
  ImpossibleTarget
}

pub fn find_fewest_coins(coins: List(Int), target: Int) -> Result(List(Int), ChangeError)
```

- 每种面额的硬币可以使用任意多枚。`coins` 是互不相同的正整数。
- 把硬币枚数最少的组合按**升序**列表放进 `Ok` 返回。（测试输入中，最少的组合只有一种。）
- `target` 为 0 时结果是 `Ok([])`。
- 任何组合都凑不出，或 `target` 为负数时，结果是 `Error(ImpossibleTarget)`。
- 先选最大硬币的做法并不总是最优。即使金额是 999，也必须在时间限制内完成。

```gleam
find_fewest_coins([1, 4, 15, 20, 50], 23)
// -> Ok([4, 4, 15])
// 先选大硬币得到 20 + 1 + 1 + 1，共 4 枚；而 4 + 4 + 15 只要 3 枚。
```
