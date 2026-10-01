---
id: cost-model-immutable-structures
title: 不可变数据结构的代价模型
---
不可变的值无法修改，所以“修改”就是构造一个新值。新值只重新构造变化的部分，其余部分与原值共享。因此函数式代码的代价大多由两个问题决定。

- 这个操作要沿着结构**走多远**？
- 这个操作要**新建多少个格子**？

## 列表是单向链表

Gleam 的 `List(a)` 是由“第一个元素 + 指向剩余列表的指针”这样的格子串成的链。前端便宜，后端昂贵。

| 操作 | 代价 | 原因 |
|---|---|---|
| `[x, ..xs]` 加在前面 | O(1) | 一个新格子指向已有的 `xs` |
| `[first, ..rest]` 模式匹配 | O(1) | 只看第一个格子 |
| `list.length(xs)` | O(n) | 不存储长度，要一直数到末尾 |
| `list.append(xs, ys)` | O(`xs` 的长度) | 复制 `xs` 的所有格子，共享 `ys` |
| `list.reverse(xs)` | O(n) | 所有格子都要新建 |
| `list.last(xs)`、第 i 个元素 | O(n)、O(i) | 必须从头往后走 |
| `list.contains(xs, x)` | O(n) | 逐个比较 |

## Dict 与 Set

`Dict` 建立在 Erlang 的 map 之上。键有 n 个时，查找和插入可以大致看作 O(log n)，比扫描列表的 O(n) 便宜得多。`dict.insert` 不改动原来的 dict，而是返回一个共享其大部分内容的新 dict。`dict.size` 是常数时间 O(1)。`gleam/set` 的 `Set` 内部就是 `Dict`，代价也相同。

## 字符串

在 Erlang 上，字符串是 UTF-8 二进制。`string.length` 要数人眼看到的字符（字素，grapheme），所以是 O(n)。像 `string.to_graphemes` 这样构造字符列表的函数也会扫描整个字符串。不要在循环里每次都重新计算同一个字符串的长度。

## 常见陷阱

在循环里执行 n 次 O(n) 的操作就会得到 O(n²)。大多数性能问题都是这个形状。

1. 为了判断是否为空而写 `list.length(xs) == 0`。模式 `[]` 或 `list.is_empty` 是 O(1)。
2. 在循环里用 `list.append(acc, [x])` 加到末尾。应该加在前面，最后反转一次。
3. 在循环里使用 `list.contains` 或访问第 i 个元素。查找频繁时改用 `Set` 或 `Dict`。
4. 用一个列表实现队列并从后面放入，每次放入都是 O(n)。应使用两个列表实现的队列。
5. 用相同参数多次进行同一个递归调用。用 `let` 接住结果一次并复用；如果重叠的子问题很多，就改用动态规划。

```gleam
import gleam/list
import gleam/set

// O(n * m)：每个订单都要扫描整个拦截列表
pub fn blocked_orders_slow(
  order_ids: List(Int),
  blocked: List(Int),
) -> List(Int) {
  list.filter(order_ids, fn(id) { list.contains(blocked, id) })
}

// 先把拦截列表转成 Set 一次，再查找。每次查找大约 O(log m)
pub fn blocked_orders(order_ids: List(Int), blocked: List(Int)) -> List(Int) {
  let blocked_set = set.from_list(blocked)
  list.filter(order_ids, fn(id) { set.contains(blocked_set, id) })
}
```

## 如何计算代价

大 O 记号描述的是输入变大时工作量增长的**形状**。n 变成 10 倍时，O(n) 变成 10 倍，O(n log n) 略多于 10 倍，O(n²) 则变成 100 倍。输入小时看不出差别，输入一大差距就急剧拉开。

本平台的性能检查不比较运行时间，而是比较 BEAM 统计的工作单位（reductions，对函数调用等工作的计数）。它不受机器状态影响，所以复杂度的差异能如实体现出来。

## 这个概念用在哪里

- 算法题的性能检查。比预期复杂度差一级的解法，在大输入上会超出限制。
- 构造列表时加在前面再反转，查找频繁时用 `Dict` 或 `Set`，队列用两个列表。
- 决定动态规划的表是用 `Dict` 存，还是只把上一行作为列表带着走。
