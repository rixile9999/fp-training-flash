Build a zipper for moving around a binary tree. A zipper carries the subtree the focus points to, together with the path (crumbs) taken from the root down to the focus. The types, `to_zipper` and `value` already exist.

```gleam
pub type Crumb(a) {
  WentLeft(value: a, right: Tree(a))   // came down to the left from a node whose value is value; right is the right child left behind
  WentRight(value: a, left: Tree(a))   // came down to the right; left is the left child left behind
}

pub opaque type Zipper(a) {
  Zipper(focus: Tree(a), crumbs: List(Crumb(a)))   // crumbs has the nearest parent first
}
```

Implement the following four functions. Every function returns a new zipper, and the original zipper does not change.

- `left(zipper)`, `right(zipper)`: move the focus to the left/right child. `Error(Nil)` if the focus is a `Leaf`.
- `up(zipper)`: move the focus to the parent. `Error(Nil)` if the focus is the root.
- `to_tree(zipper)`: return the whole tree, wherever the focus is.

```gleam
// tree = 1(2(_, 3), 4)
let assert Ok(z) = to_zipper(tree) |> left      // focus: 2
let assert Ok(z) = right(z)                      // focus: 3
value(z)    // -> Ok(3)
to_tree(z)  // -> tree
```
