Implement two functions that build a binary search tree holding integers.

```gleam
pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}
```

- `to_tree(data)`: start from an empty tree and return the tree you get by inserting the list's elements one by one, **starting from the first**.
  - If the value to insert is **smaller than or equal to** the node's value, insert it into the left subtree; if it is greater, into the right subtree.
  - When you reach an empty spot (`Empty`), create `Node(value, Empty, Empty)`.
- `sorted_data(data)`: build a tree from the list, then return the tree's values as an ascending list. Keep every copy of equal values.

```gleam
to_tree([4, 2, 6, 3])
// -> Node(4, Node(2, Empty, Node(3, Empty, Empty)), Node(6, Empty, Empty))
sorted_data([2, 1, 3, 6, 7, 5])
// -> [1, 2, 3, 5, 6, 7]
```
