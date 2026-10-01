Build a first-in, first-out (FIFO) queue using only immutable lists. The queue type is already defined.

```gleam
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}
```

`front` holds items in the order they will come out, and `back` holds them in **reverse** insertion order. Implement the following three functions.

- `push(queue, item)`: return a new queue with `item` added at the back.
- `pop(queue)`: return the front item and the rest of the queue as `Ok(#(item, rest))`. If the queue is empty, return `Error(Nil)`.
- `to_list(queue)`: list the queue's items in the order they come out (earliest added first).

Every function returns a new queue, and the queue passed in as an argument does not change. Adding n items and taking them all out must cost O(n) in total. Grading measures the cost of adding and removing up to 16,000 items.

```gleam
let q = fifo.new() |> fifo.push(1) |> fifo.push(2)
fifo.pop(q)
// -> Ok(#(1, a queue with only item 2 left))
fifo.to_list(fifo.push(q, 3))
// -> [1, 2, 3]
```
