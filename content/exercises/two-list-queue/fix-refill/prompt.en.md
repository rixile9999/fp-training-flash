The `fifo` module below is a first-in, first-out (FIFO) queue built from two lists. `front` holds items in the order they come out, and `back` holds them in reverse insertion order. But there are reports that after adding a few items and taking them out, the item added later comes out first. Fix it.

- `pop(queue)` returns the earliest-added item and the rest of the queue as `Ok(#(item, rest))`. For an empty queue, it returns `Error(Nil)`.
- `to_list(queue)` lists items in the order they come out.
- Adding n items and taking them all out must cost O(n) in total. Grading measures the cost with up to 16,000 items.

```gleam
let q = fifo.new() |> fifo.push(1) |> fifo.push(2) |> fifo.push(3)
fifo.pop(q)
// Now:      Ok(#(3, ...))
// Expected: Ok(#(1, ...))
```
