程序拆分成了 `parse_line → record → points/compare_rows → format_row`，所以先从失败测试所调用的函数开始怀疑，就能很快缩小 bug 的范围。纯函数只要输入相同，无论在哪里调用都会给出相同的值，所以可以相信单独调用某一步得到的结果，然后再去看下一步（理论笔记“引用透明性”）。

**Bug 1：`record` 中的平局。** `Draw` 分支只更新了主队。一场比赛总会改变两支球队的战绩，所以客队也要用 `Draw` 更新。如果像基础题的题解那样，先把结果转成 `#(主队视角, 客队视角)` 这一对，再分别更新两队一次，就能从根本上避免“每个分支重复写更新代码、结果漏掉一边”的错误。

**Bug 2：`points` 的公式。** `stats.won * 3 + stats.lost` 给失利计了分。正确的是 `stats.won * 3 + stats.drawn`。使用名字相近字段的地方，只有用各字段值互不相同的输入（例如 `Stats(2, 1, 3)`）来测试，问题才会暴露出来。

**Bug 3：排序方向。** `int.compare(points(a.1), points(b.1))` 是升序。交换参数顺序改成 `int.compare(points(b.1), points(a.1))`，名称比较（`string.compare(a.0, b.0)`）保持不变。

常见的错误修改是 `list.sort(order.reverse(compare_rows))`。积分变成了降序，但并列时的名称顺序也被反转，`Courageous` 排到了 `Allegoric` 前面。排序依据有多个时，只能挑出需要反转的那个依据来反转。

*原题：Exercism Gleam 路线的 `tournament`（MIT, Copyright (c) 2021 Exercism）。重新编排为修 bug 题。*
