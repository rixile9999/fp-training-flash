急诊室用左偏堆管理候诊队列。每位患者有姓名、病情严重程度（`severity`，越大越危急）和到达序号（`arrival`，越小越早到）。

```gleam
pub type Patient {
  Patient(name: String, severity: Int, arrival: Int)
}
```

就诊规则：病情更重的患者优先。病情相同时，先到的患者优先。每位患者的到达序号都不同。

堆类型 `Queue` 以及 `rank`、`make`（创建节点时把 rank 较大的子节点放在左边）、`add`、`next` 都已提供。请实现下面三个函数。

- `goes_first(a, b)`：按规则 `a` 应先于 `b` 就诊时返回 `True`。
- `merge(a, b)`：合并两个队列得到的左偏堆。根节点是按 `goes_first` 标准最先就诊的患者。用 `make` 创建节点。
- `treatment_order(patients)`：把所有患者放入队列后，按就诊顺序返回姓名列表。

```gleam
treatment_order([Patient("金", 2, 1), Patient("李", 5, 2), Patient("朴", 5, 3)])
// -> ["李", "朴", "金"]   李和朴病情相同，先到的李排在前面
```
