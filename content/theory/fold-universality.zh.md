---
id: fold-universality
title: fold 的普适性：列表递归的共同骨架
---
几乎所有把列表遍历到底的递归函数都是同一个形状：空列表时有一个要返回的值 `v`；是 `[x, ..rest]` 时，用函数 `f` 把 `x` 与处理 `rest` 得到的结果合并起来。

```text
g([])          = v
g([x, ..rest]) = f(g(rest), x)
```

`list.fold_right(xs, v, f)` 正是把这个形状实现了一次的函数。**普适性**（universal property）是说这层关系是双向的：如果某个函数 `g` 满足上面两个等式，那么 `g` 一定等于 `fold_right(_, v, f)`。因此，求和、长度、`map`、`filter` 这些由“空的情况 + 逐格合并”定义的函数，都可以写成折叠（fold）。另外，只要证明两个函数用相同的 `v` 和 `f` 满足上面两个等式，就能得出两者相等的结论，而不必重新做一遍归纳证明，因为在证明普适性时已经用过一次归纳法了。

```gleam
import gleam/list

pub fn map_via_fold(xs: List(a), f: fn(a) -> b) -> List(b) {
  list.fold_right(xs, [], fn(acc, x) { [f(x), ..acc] })
}

pub fn filter_via_fold(xs: List(a), keep: fn(a) -> Bool) -> List(a) {
  list.fold_right(xs, [], fn(acc, x) {
    case keep(x) {
      True -> [x, ..acc]
      False -> acc
    }
  })
}
```

用 fold 来思考，可以把问题归结为两个问题：“空输入的答案是什么？”和“已有剩余部分的答案时，怎样再加入一项？”这两个答案一旦确定，就不用自己写遍历代码了。把累加值做成元组，还可以在一次遍历中同时算出总和与个数等多个结果。

## 左折叠与右折叠

Gleam 的 `list.fold` 从左边开始累积，是尾递归函数；`list.fold_right` 从右边开始合并，不是尾递归。两个函数的回调都按 `fn(acc, x)` 的顺序接收参数，所以区别只在于访问各项的顺序。同时满足交换律和结合律的运算（`+`、`int.max`）无论方向如何结果都一样。而拼接字符串、构造列表这类顺序有意义的运算，方向会改变结果。

```gleam
import gleam/list

pub fn reverse_via_fold(xs: List(a)) -> List(a) {
  list.fold(xs, [], fn(acc, x) { [x, ..acc] })
}
```

用 `list.fold` 累积 `[x, ..acc]` 会让顺序反过来。常见的错误是忘了这一点，直接返回结果。需要保持顺序时，就在最后调用一次 `list.reverse`，或者改用 `fold_right`。在 BEAM 上，体递归的栈也会按需增长，所以 `fold_right` 在长列表上也不会溢出。构造列表时两种方式的速度和内存占用通常差不多（参见“累加器与尾递归”），选更好读的那个就行。

## 这个概念用在哪里

- 把事件列表依次应用、得到最终状态的计算，就是以初始状态为 `v`、以应用事件为 `f` 的 fold。
- 要一次求出总和、个数和最大值时，用元组或记录作为累加值。
- 认出手写的递归函数是 fold 的形状后，就可以改用 `list.fold` 或 `list.map`，让代码更短也更安全。
