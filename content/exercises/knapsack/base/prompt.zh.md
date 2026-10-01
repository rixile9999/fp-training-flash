一位登山向导要把物资背到大本营。每件物品都有价值和重量，背包最多只能承受固定的重量。请选出物品，使价值总和尽可能大，并返回这个**价值总和**。

```gleam
pub type Item {
  Item(value: Int, weight: Int)
}

pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int
```

- 所选物品的总重量必须不超过 `maximum_weight`。
- 每件物品只有一件。每件物品要么放入，要么不放。
- 所有价值和重量都是正整数。什么都放不进去时，答案为 0。
- 即使有 50 件物品，也必须在时间限制内完成。

```gleam
maximum_value(
  [Item(value: 10, weight: 5), Item(value: 40, weight: 4),
   Item(value: 30, weight: 6), Item(value: 50, weight: 4)],
  10,
)
// -> 90（第二件和第四件物品，重量 8）
```
