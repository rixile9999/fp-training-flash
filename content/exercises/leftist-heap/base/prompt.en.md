Implement an integer min-heap as a leftist heap. Every operation returns a new heap and leaves the original heap unchanged.

```gleam
pub type Heap {
  Empty
  Node(rank: Int, value: Int, left: Heap, right: Heap)
}
```

- A parent's `value` is less than or equal to its children's `value`s (min-heap).
- `rank` is the number of nodes on the way down the right children to `Empty`. The rank of `Empty` is 0.
- **Leftist property**: at every node, `rank(left) >= rank(right)`, and the node's `rank` is `rank(right) + 1`.

`rank` and `find_min` are already provided. Implement the following four functions.

- `make(value, a, b)`: build a node with `a` and `b` as children. Put the one with the higher rank on the left (if equal, `a` goes on the left), and set the rank correctly.
- `merge(a, b)`: a heap holding all the values of both heaps. Build nodes with `make`.
- `insert(heap, value)`: the heap with one value inserted.
- `delete_min(heap)`: return the heap without its minimum (the root) as `Ok`. For an empty heap, `Error(Nil)`.

All three operations must be O(log n). Grading measures the cost of inserting 8,000 values in ascending order, starting from 0, and then taking them all out.

```gleam
let leaf = fn(v) { Node(1, v, Empty, Empty) }
make(1, Empty, leaf(5))
// -> Node(rank: 1, value: 1, left: leaf(5), right: Empty)
[5, 3, 8] |> list.fold(Empty, insert) |> find_min
// -> Ok(3)
```
