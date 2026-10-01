---
id: gleam-recursion
title: 递归与累加器
---
Gleam 没有 `for`、`while` 循环，重复操作要用再次调用自身的**递归**来写。列表只有
`[]`（空）和 `[x, ..rest]`（第一项和其余部分）两种形状，所以只需处理这两种情况。

| 组成部分 | 作用 |
|---|---|
| 基本情况 | 对无法再拆分的输入（`[]`、`0`）直接返回答案 |
| 递归情况 | 把输入缩小一步（`rest`、`n - 1`）再调用自身 |
| 累加器 `acc` | 把目前为止的结果作为参数带着走 |
| 辅助函数 | 隐藏累加器初始值的私有 `loop` 函数 |

```gleam
import gleam/list

// 普通递归：在返回的路上相加。
pub fn sum(xs: List(Int)) -> Int {
  case xs {
    [] -> 0
    [x, ..rest] -> x + sum(rest)
  }
}

// 尾递归：递归调用是最后一步，所以调用栈不会增长。
pub fn doubled(xs: List(Int)) -> List(Int) {
  doubled_loop(xs, [])
}

fn doubled_loop(xs: List(Int), acc: List(Int)) -> List(Int) {
  case xs {
    [] -> list.reverse(acc)
    [x, ..rest] -> doubled_loop(rest, [x * 2, ..acc])
  }
}
// doubled([1, 2, 3]) == [2, 4, 6]
```

如果输入可能非常长，就写成尾递归。对于简单的转换，`list.map`、`list.fold` 已经封装好了这种模式。

常见错误：累加器列表是往前面添加元素构建的，所以会倒序堆积。如果在基本情况中漏掉 `list.reverse`，
结果的顺序就会颠倒。
