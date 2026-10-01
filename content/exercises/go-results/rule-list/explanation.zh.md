规则的数量不固定，所以需要一个 fold：把“到目前为止的游戏”作为累加器带着走，逐条应用规则。但每一步都可能失败，所以用的不是普通的 `list.fold`，而是 `list.try_fold`。

```gleam
rules
|> list.try_fold(game, fn(current, rule) { rule(current) })
|> result.map(change_player)
```

函数返回 `Ok(next)` 时，`list.try_fold` 把 `next` 作为下一个累加器；返回 `Error(e)` 时，不再看剩下的规则，立即返回 `Error(e)`。这样，“在第一个错误处停止”和“下一条规则接收前一条规则的结果”就一次性解决了。列表为空时，初始游戏原样以 `Ok` 输出。交换轮次只应在成功时进行，所以用 `result.map` 接上。

常见错误有两种。

- 在 `list.fold` 里跳过失败的规则（原样返回当前游戏），最后再包上 `Ok`。错误消失了，违反规则的一手看起来像是成功的一手。
- 像 `list.try_map(rules, fn(rule) { rule(game) })` 这样，把每条规则分别应用到**最初的游戏**上。错误能被捕获，但规则的修改没有衔接起来，即使提了三次子，结果里也只留下一次。

可以把 `try_fold` 看作把基础题的 `result.try` 管道按列表长度展开。这一关系在理论笔记“串联 Result 与单子”（chaining-results-monads）中有更多介绍。
