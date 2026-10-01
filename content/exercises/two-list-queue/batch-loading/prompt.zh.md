在快递装车场，到达的快递先放进等待队列，卡车来了就从前面开始装上规定数量的快递。等待队列是用两个列表实现的队列。`new`、`push`、`to_list` 已经有了（`front` 是取出顺序，`back` 是放入顺序的逆序）。实现下面两个函数。

- `pop(queue)`：以 `Ok(#(item, rest))` 返回最先放入的元素和剩余的队列。空队列时返回 `Error(Nil)`。
- `take(queue, n)`：从前面最多取出 `n` 个，返回 `#(取出的元素列表, 剩余的队列)`。
  - 取出的元素列表按到达顺序排列（先放入的在前）。
  - 队列中的元素少于 `n` 个时，全部取出。
  - `n` 小于等于 0 时什么也不取，原样返回队列。

```gleam
let q = fifo.new() |> fifo.push("p1") |> fifo.push("p2") |> fifo.push("p3")
let #(batch, rest) = fifo.take(q, 2)
// batch -> ["p1", "p2"]
// fifo.to_list(rest) -> ["p3"]
```
