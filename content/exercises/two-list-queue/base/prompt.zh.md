只用不可变列表实现一个先进先出（FIFO）队列。队列类型已经定义好了。

```gleam
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}
```

`front` 按取出顺序存放元素，`back` 按放入顺序的**逆序**存放元素。实现下面三个函数。

- `push(queue, item)`：返回把 `item` 放到队尾后的新队列。
- `pop(queue)`：以 `Ok(#(item, rest))` 返回队首元素和剩余的队列。队列为空时返回 `Error(Nil)`。
- `to_list(queue)`：按取出顺序（先放入的在前）列出队列中的元素。

所有函数都返回新队列，作为参数传入的队列不会改变。放入 n 个元素再全部取出的总开销必须是 O(n)。评测时会测量放入和取出最多 16,000 个元素的开销。

```gleam
let q = fifo.new() |> fifo.push(1) |> fifo.push(2)
fifo.pop(q)
// -> Ok(#(1, 只剩元素 2 的队列))
fifo.to_list(fifo.push(q, 3))
// -> [1, 2, 3]
```
