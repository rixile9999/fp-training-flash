实现两个函数，用来构建存放整数的二叉搜索树。

```gleam
pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}
```

- `to_tree(data)`：从空树开始，把列表元素**从第一个开始**依次插入，返回得到的树。
  - 要插入的值**小于或等于**节点值时插入左子树，大于时插入右子树。
  - 到达空位（`Empty`）时，创建 `Node(值, Empty, Empty)`。
- `sorted_data(data)`：用列表建树，然后把树中的值按升序列表返回。相等的值有几个就保留几个。

```gleam
to_tree([4, 2, 6, 3])
// -> Node(4, Node(2, Empty, Node(3, Empty, Empty)), Node(6, Empty, Empty))
sorted_data([2, 1, 3, 6, 7, 5])
// -> [1, 2, 3, 5, 6, 7]
```
