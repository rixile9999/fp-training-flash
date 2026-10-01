下面的 `fifo` 模块是用两个列表实现的先进先出（FIFO）队列。`front` 按取出顺序存放元素，`back` 按放入顺序的逆序存放元素。但有人反馈，放入几个元素再取出时，后放入的元素会先出来。请修复它。

- `pop(queue)` 以 `Ok(#(item, rest))` 返回最先放入的元素和剩余的队列。空队列时返回 `Error(Nil)`。
- `to_list(queue)` 按取出顺序列出元素。
- 放入 n 个元素再全部取出的总开销必须是 O(n)。评测时会测量最多 16,000 个元素的开销。

```gleam
let q = fifo.new() |> fifo.push(1) |> fifo.push(2) |> fifo.push(3)
fifo.pop(q)
// 现在：  Ok(#(3, ...))
// 期望值：Ok(#(1, ...))
```
