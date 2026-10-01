这道题如果一口气写完，很容易变成一个很长的函数；但在数据形状发生变化的每个地方切开，每一块都很短。

```text
String ─split→ List(String) ─filter_map(parse_line)→ List(Match)
       ─fold(record)→ Dict(String, Stats) ─to_list→ List(#(String, Stats))
       ─sort(compare_rows)→ ─map(format_row)→ List(String) ─join→ String
```

`tally` 就是用管道把这个流程原样写出来（理论笔记“函数组合与管道”）。每一步都是纯函数，所以也可以逐步测试。

**解析。** 在 `case string.split(line, ";")` 中像 `[home, away, "win"]` 这样把列表模式和字符串字面量一起匹配，字段数检查和结果字符串检查就一次完成了。把结果转成 `Outcome` 类型后，后续步骤就不用再担心字符串拼写错误（理论笔记“和类型与穷尽匹配”）。如果像原版 Exercism 题解那样把其余情况都当作 `Draw`，`tie` 这样的错误行就会被记成平局。

**更新战绩。** 比赛结果以主队视角表示，所以先把它转成 `#(主队视角结果, 客队视角结果)` 这一对（`Loss -> #(Loss, Win)`）。然后对两队应用同一个 `add_result` 函数，就不容易漏掉“客队也要更新”，也不容易搞混视角。整个比赛列表用 `list.fold(dict.new(), record)` 折叠（理论笔记“fold 的普适性”）。

**排序。** `int.compare(points(b.1), points(a.1))` 交换参数顺序得到降序，`order.break_tie` 只在积分相同时才使用名称比较。`dict.to_list` 的顺序没有保证，所以名称顺序也必须显式排序。

**输出。** 球队名称用 `string.pad_end`（左对齐），数字用 `string.pad_start`（右对齐）。把两者弄反，每一行都会错位。

常见错误：把 `loss` 记为主队失利后，又复制粘贴给客队也记了失利；把未知结果当作平局；把球队名称右对齐。

*原题：Exercism Gleam 路线的 `tournament`（MIT, Copyright (c) 2021 Exercism）。在此基础上加入了辅助函数拆分和错误行处理规则，重新编排。*
