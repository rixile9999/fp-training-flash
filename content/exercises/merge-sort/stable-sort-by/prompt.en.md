A logistics center processes its list of shipments in order of priority. Shipments with the same priority must be processed **in the order they were received** (their original order in the list). Implement `sort_by`, a stable merge sort that sorts values of any type using a compare function.

```gleam
pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a)
```

- Sort in ascending order: if `compare(x, y)` is `Lt`, `x` comes first; if it is `Gt`, `y` comes first.
- Elements for which `compare` gives `Eq` keep the order they had in the input list (stable sort).
- It must finish within the time limit even with 150,000 elements (O(n log n)). Do not use `list.sort`.

```gleam
let by_priority = fn(a: Shipment, b: Shipment) { int.compare(a.priority, b.priority) }
sort_by([Shipment("A", 2), Shipment("B", 1), Shipment("C", 2), Shipment("D", 1)], by_priority)
// -> [Shipment("B", 1), Shipment("D", 1), Shipment("A", 2), Shipment("C", 2)]
```
