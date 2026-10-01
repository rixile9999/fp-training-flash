Add operations to a binary tree zipper that change the spot at the focus. The movement functions (`to_zipper`, `left`, `right`, `up`, `to_tree`, `value`) already exist. A zipper holds the subtree the focus points to and the path (crumbs) back to the root.

- `set_value(zipper, value)`: change the value of the focus node to `value`. The children stay the same. If the focus is a `Leaf`, replace it with `Node(value, Leaf, Leaf)`.
- `set_left(zipper, tree)`: replace the left child of the focus node with `tree`. `Error(Nil)` if the focus is a `Leaf`.
- `set_right(zipper, tree)`: replace the right child of the focus node with `tree`. `Error(Nil)` if the focus is a `Leaf`.

Every function returns a new zipper, and the position of the focus stays the same. The original zipper does not change.

```gleam
// tree = 1(2(_, 3), 4)
let assert Ok(z) = to_zipper(tree) |> left      // focus: 2
z |> set_value(5) |> to_tree
// -> 1(5(_, 3), 4)
```
