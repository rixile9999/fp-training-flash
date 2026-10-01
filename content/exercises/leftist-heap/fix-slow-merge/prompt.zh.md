下面的 `heap` 模块用左偏堆实现了整数最小堆。取出的顺序是对的，但有人报告说：按升序插入大量值时会越来越慢，到几千个时明显卡顿。请修复它。

- `rank` 是沿右子节点一直走到 `Empty` 所经过的节点数。`Empty` 的 rank 为 0。
- 在每个节点上必须满足 `rank(left) >= rank(right)`，并且节点的 `rank` 必须等于 `rank(right) + 1`。
- `make(value, a, b)` 把 rank 较大的一侧放在左边。相等时 `a` 放左边。
- `merge`、`insert`、`delete_min` 必须是 O(log n)。评测时会测量按升序插入 8,000 个值再全部取出的开销。

```gleam
make(1, Empty, Node(1, 5, Empty, Empty))
// 现在：  Node(rank: 1, value: 1, left: Empty, right: Node(1, 5, Empty, Empty))
// 期望值：Node(rank: 1, value: 1, left: Node(1, 5, Empty, Empty), right: Empty)
```
