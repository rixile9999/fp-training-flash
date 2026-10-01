The `heap` module below implements an integer min-heap as a leftist heap. Values come out in the right order, but there is a report that inserting many values in ascending order makes it slower and slower, with a noticeable stall at a few thousand values. Fix it.

- `rank` is the number of nodes on the way down the right children to `Empty`. The rank of `Empty` is 0.
- At every node, `rank(left) >= rank(right)` must hold, and the node's `rank` must be `rank(right) + 1`.
- `make(value, a, b)` puts the side with the higher rank on the left. If equal, `a` goes on the left.
- `merge`, `insert` and `delete_min` must be O(log n). Grading measures the cost of inserting 8,000 values in ascending order and taking them all out.

```gleam
make(1, Empty, Node(1, 5, Empty, Empty))
// now:      Node(rank: 1, value: 1, left: Empty, right: Node(1, 5, Empty, Empty))
// expected: Node(rank: 1, value: 1, left: Node(1, 5, Empty, Empty), right: Empty)
```
