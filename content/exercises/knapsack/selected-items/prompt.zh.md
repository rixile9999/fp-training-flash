快递货车的调度员不仅要知道价值总和，还要知道**装哪些货物**。给定货物列表和重量上限，求出价值总和最大的组合的价值总和，以及其中货物的 id 列表。

```gleam
pub type Cargo {
  Cargo(id: String, value: Int, weight: Int)
}

pub type Selection {
  Selection(total_value: Int, ids: List(String))
}

pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection
```

- 所选货物的总重量不超过 `max_weight`。每件货物最多装一次。价值和重量都是正整数。
- `ids` **按输入列表的顺序**存放所选货物的 id。什么都装不了时，结果是 `Selection(0, [])`。
- 在测试输入中，价值总和最大的组合只有一个。
- 即使有 40 件货物，也必须在时间限制内完成。

```gleam
best_selection(
  [Cargo("a", 60, 5), Cargo("b", 50, 4), Cargo("c", 70, 6), Cargo("d", 30, 3)],
  10,
)
// -> Selection(total_value: 120, ids: ["b", "c"])
```
