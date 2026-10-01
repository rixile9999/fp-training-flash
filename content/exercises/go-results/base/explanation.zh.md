这道题的核心是这样一个要求：“失败时跳过之后的步骤，回到失败之前的状态”。用管道把 `Result` 串起来，这个要求就直接变成了代码的形状。

```gleam
let outcome =
  game
  |> rule1
  |> result.map(rule2)
  |> result.try(rule3)
  |> result.try(rule4)
```

- `result.try(r, f)` 只在 `r` 为 `Ok(g)` 时调用 `f(g)`。它不碰 `Error`，让它一路流到最后，所以第一个错误之后的规则都不会执行，留下的正是第一个错误消息。
- `rule2` 不返回 `Result`，所以用 `result.map` 接入。放进 `result.try` 会导致类型不匹配。

管道结束后，只用 `case` 拆分一次结果。`Ok(updated)` 时，在规则修改后的游戏中只交换轮次；`Error(message)` 时，把错误记录到**最初收到的 `game`** 上。值是不可变的，原来的 `game` 在经过各条规则的过程中完全没有改变，因此不必为失败情况另外实现“撤销”。

常见错误有两种。

- 用嵌套的 `case` 一步步拆开，并把错误记录到失败那一刻的游戏上（例如 `rule2` 提子之后的游戏）。规则是“失败时丢弃修改”，所以如果提子数被保留下来就错了。
- 无论成功还是失败都调用 `change_player`。违反规则的一手等于没有下，所以不能交换轮次。

把错误当作值来处理、只串联成功路径的思路，在理论笔记“错误也是值”（errors-as-values）和“串联 Result 与单子”（chaining-results-monads）中有更多介绍。
