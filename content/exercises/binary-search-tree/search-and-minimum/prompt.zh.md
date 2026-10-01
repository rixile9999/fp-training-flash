实现两个用于二叉搜索树（左子树的值都**小于或等于**节点值，右子树的值都**大于**节点值）的查询函数。

```gleam
pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}
```

- `contains(tree, value) -> Bool`：树中有 `value` 时返回 `True`，否则返回 `False`。
- `minimum(tree) -> Result(Int, Nil)`：以 `Ok` 返回树中最小的值。空树返回 `Error(Nil)`。
- 在 13 万个节点的平衡树中查找 4 万次，也必须在时间限制内完成。每次比较时**只向一侧子树**下降。

```gleam
let tree = Node(8, Node(3, Node(1, Empty, Empty), Node(6, Empty, Empty)), Node(10, Empty, Empty))
contains(tree, 6)   // -> True
contains(tree, 7)   // -> False
minimum(tree)       // -> Ok(1)
minimum(Empty)      // -> Error(Nil)
```
