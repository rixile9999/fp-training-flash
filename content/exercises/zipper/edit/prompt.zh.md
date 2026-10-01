请给二叉树拉链添加修改焦点位置的操作。移动函数（`to_zipper`、`left`、`right`、`up`、`to_tree`、`value`）已经提供。拉链保存焦点（focus）所指的子树和回到根的路径（crumbs）。

- `set_value(zipper, value)`：把焦点节点的值改为 `value`。子节点保持不变。焦点是 `Leaf` 时，换成 `Node(value, Leaf, Leaf)`。
- `set_left(zipper, tree)`：把焦点节点的左子节点换成 `tree`。焦点是 `Leaf` 时返回 `Error(Nil)`。
- `set_right(zipper, tree)`：把焦点节点的右子节点换成 `tree`。焦点是 `Leaf` 时返回 `Error(Nil)`。

所有函数都返回新的拉链，焦点的位置保持不变。原来的拉链不会改变。

```gleam
// tree = 1(2(_, 3), 4)
let assert Ok(z) = to_zipper(tree) |> left      // 焦点：2
z |> set_value(5) |> to_tree
// -> 1(5(_, 3), 4)
```
