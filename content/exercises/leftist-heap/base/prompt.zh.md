用左偏堆（leftist heap）实现整数最小堆。所有操作都返回新的堆，原来的堆保持不变。

```gleam
pub type Heap {
  Empty
  Node(rank: Int, value: Int, left: Heap, right: Heap)
}
```

- 父节点的 `value` 小于或等于子节点的 `value`（最小堆）。
- `rank` 是沿右子节点一直走到 `Empty` 所经过的节点数。`Empty` 的 rank 为 0。
- **左偏性质**：在每个节点上 `rank(left) >= rank(right)`，并且节点的 `rank` 等于 `rank(right) + 1`。

`rank` 和 `find_min` 已经提供。请实现下面四个函数。

- `make(value, a, b)`：创建以 `a` 和 `b` 为子节点的节点。把 rank 较大的一侧放在左边（相等时 `a` 放左边），并正确设置 rank。
- `merge(a, b)`：包含两个堆所有值的堆。用 `make` 创建节点。
- `insert(heap, value)`：插入一个值后的堆。
- `delete_min(heap)`：以 `Ok` 返回去掉最小值（根）后的堆。空堆返回 `Error(Nil)`。

三个操作都必须是 O(log n)。评测时会测量从 0 开始按升序插入 8,000 个值、再全部取出的开销。

```gleam
let leaf = fn(v) { Node(1, v, Empty, Empty) }
make(1, Empty, leaf(5))
// -> Node(rank: 1, value: 1, left: leaf(5), right: Empty)
[5, 3, 8] |> list.fold(Empty, insert) |> find_min
// -> Ok(3)
```
