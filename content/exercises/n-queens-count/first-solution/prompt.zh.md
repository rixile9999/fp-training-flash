在 n x n 棋盘上放置 n 个互不攻击的皇后的所有摆法中，找出**字典序最小**的那一种。

```gleam
pub fn first_solution(n: Int) -> Result(List(Int), Nil)
```

- 摆法是从最上面一行开始，依次列出各行皇后所在列号（从 0 开始）的列表。
- 比较两种摆法时，先比较第一个列号，相同再比较下一个列号。较小的一方排在前面。
- 一种摆法都没有时，返回 `Error(Nil)`。`n` 至少为 1。

`is_safe(placed, col)` 已经提供。`placed` 是上方各行的列号，**紧邻上一行排在最前面**；如果下一行的第 `col` 列是安全的，就返回 `True`。

```gleam
first_solution(4)  // -> Ok([1, 3, 0, 2])
first_solution(3)  // -> Error(Nil)
```
