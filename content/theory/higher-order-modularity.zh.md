---
id: higher-order-modularity
title: 高阶函数与模块化
---
能把程序拆得多好，取决于把拆开的部分**重新黏合起来的方法**有多强大。Hughes 指出函数式语言提供了两种强大的黏合剂：高阶函数和惰性求值。Gleam 是及早求值（eager evaluation）的语言，默认不提供第二种黏合剂，但第一种可以直接使用。

高阶函数是接收函数作为参数或返回函数的函数。核心在于**把控制结构与决策分离**。`list.map`、`list.filter`、`list.fold` 只实现一次“如何遍历列表”，而“在每一项上决定什么”由调用方以函数形式传入。遍历代码一旦验证过就能反复复用，新写的代码只有一条业务规则。

返回函数的一方也有同样的效果。根据配置值构造规则函数，就能像数据一样把规则放进列表并组合。

```gleam
import gleam/int
import gleam/list

pub type Rule =
  fn(Int) -> Int

pub fn percent_off(percent: Int) -> Rule {
  fn(amount) { amount - amount * percent / 100 }
}

pub fn flat_off(value: Int) -> Rule {
  fn(amount) { int.max(0, amount - value) }
}

pub fn apply_all(amount: Int, rules: List(Rule)) -> Int {
  list.fold(rules, amount, fn(acc, rule) { rule(acc) })
}
```

`apply_all(10_000, [percent_off(10), flat_off(1000)])` 的结果是 8000。`percent_off` 返回的函数是一个记住了 `percent` 值的闭包。新增一种折扣方式，`apply_all` 也不用改；要改变应用顺序，只需改变列表的顺序。每条规则可以单独测试，`apply_all` 只需测试“按顺序应用”这一个性质。

## 模块化的标准

Parnas 提出的模块划分标准是“把可能变化的决策隐藏在一处”。高阶函数在函数层面实践了这一原则。经常变化的东西（折扣规则、排序标准、过滤条件）作为参数传入，不常变化的东西（遍历、累积、保持顺序）留在高阶函数内部。`list.sort(xs, by: compare)` 把排序算法与比较标准分开，也是同样的结构。

## 什么时候不该抽象

当两处以上的代码**只有一个决策不同**、其余都相同时，再把这个决策提取为函数参数。只有一处使用却提前增加函数参数，只会让签名变复杂，读代码的人还得到处去找实际传进来的函数。常见的错误恰恰相反：把几乎相同的遍历代码只改一下条件就复制好几份。改一处时很容易忘了其他几处。

## 这个概念用在哪里

- 把价格、折扣、校验规则这类经常新增的策略表示为函数列表时。
- 让调用方决定排序标准、过滤条件、汇总方式时。
- 把重复的递归代码重构为 `list.map`、`list.fold` 等现有高阶函数时。
