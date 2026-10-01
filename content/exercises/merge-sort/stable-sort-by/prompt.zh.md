物流中心按优先级顺序处理配送列表。优先级相同的配送必须按 **受理顺序**（列表中原来的顺序）处理。请实现 `sort_by`：一个用比较函数对任意类型进行排序的稳定归并排序。

```gleam
pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a)
```

- 按升序排序：`compare(x, y)` 为 `Lt` 时 `x` 在前，为 `Gt` 时 `y` 在前。
- `compare` 结果为 `Eq` 的元素之间保持它们在输入列表中的顺序（稳定排序）。
- 即使有 15 万个元素也必须在时间限制内完成（O(n log n)）。不要使用 `list.sort`。

```gleam
let by_priority = fn(a: Shipment, b: Shipment) { int.compare(a.priority, b.priority) }
sort_by([Shipment("A", 2), Shipment("B", 1), Shipment("C", 2), Shipment("D", 1)], by_priority)
// -> [Shipment("B", 1), Shipment("D", 1), Shipment("A", 2), Shipment("C", 2)]
```
