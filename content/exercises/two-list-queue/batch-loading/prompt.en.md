At a parcel loading dock, arriving parcels go into a waiting queue, and when a truck comes, a set number of them are loaded starting from the front. The queue is built from two lists. `new`, `push` and `to_list` already exist (`front` is in the order items come out, `back` is in reverse insertion order). Implement the following two functions.

- `pop(queue)`: return the earliest-added item and the rest of the queue as `Ok(#(item, rest))`. For an empty queue, return `Error(Nil)`.
- `take(queue, n)`: take up to `n` items from the front and return `#(list of taken items, remaining queue)`.
  - The list of taken items is in arrival order (the earliest added comes first).
  - If the queue has fewer than `n` items, take all of them.
  - If `n` is 0 or less, take nothing and return the queue as is.

```gleam
let q = fifo.new() |> fifo.push("p1") |> fifo.push("p2") |> fifo.push("p3")
let #(batch, rest) = fifo.take(q, 2)
// batch -> ["p1", "p2"]
// fifo.to_list(rest) -> ["p3"]
```
