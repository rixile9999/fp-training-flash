Implement two lookup functions for a binary search tree (every value in the left subtree is **less than or equal to** the node's value, and every value on the right is **greater** than it).

```gleam
pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}
```

- `contains(tree, value) -> Bool`: `True` if `value` is in the tree, `False` otherwise.
- `minimum(tree) -> Result(Int, Nil)`: return the smallest value in the tree as `Ok`. For an empty tree, `Error(Nil)`.
- 40,000 lookups in a balanced tree of 130,000 nodes must finish within the time limit. On each comparison, go down into **only one subtree**.

```gleam
let tree = Node(8, Node(3, Node(1, Empty, Empty), Node(6, Empty, Empty)), Node(10, Empty, Empty))
contains(tree, 6)   // -> True
contains(tree, 7)   // -> False
minimum(tree)       // -> Ok(1)
minimum(Empty)      // -> Error(Nil)
```
