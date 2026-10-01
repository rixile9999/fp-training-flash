请实现一个在二叉树上移动的拉链（zipper）。拉链同时携带焦点（focus）所指的子树，以及从根下到焦点的路径（crumbs）。类型以及 `to_zipper`、`value` 已经提供。

```gleam
pub type Crumb(a) {
  WentLeft(value: a, right: Tree(a))   // 从值为 value 的节点向左下来；right 是留下的右子节点
  WentRight(value: a, left: Tree(a))   // 向右下来；left 是留下的左子节点
}

pub opaque type Zipper(a) {
  Zipper(focus: Tree(a), crumbs: List(Crumb(a)))   // crumbs 中最近的父节点在最前面
}
```

请实现下面四个函数。所有函数都返回新的拉链，原来的拉链保持不变。

- `left(zipper)`、`right(zipper)`：把焦点移到左/右子节点。焦点是 `Leaf` 时返回 `Error(Nil)`。
- `up(zipper)`：把焦点移到父节点。焦点是根时返回 `Error(Nil)`。
- `to_tree(zipper)`：无论焦点在哪里，都返回整棵树。

```gleam
// tree = 1(2(_, 3), 4)
let assert Ok(z) = to_zipper(tree) |> left      // 焦点：2
let assert Ok(z) = right(z)                      // 焦点：3
value(z)    // -> Ok(3)
to_tree(z)  // -> tree
```
