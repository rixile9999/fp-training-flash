一个货架会展开成多个编码，所以基本框架与原来的计分表转换相同。外层 `dict.fold` 遍历每个货架，内层 `list.fold` 遍历该货架上的每个编码，把条目累积到结果 dict 中。

```gleam
list.fold(codes, index, fn(acc, raw) {
  case normalize(raw) {
    "" -> acc
    code -> dict.insert(acc, code, shelf)
  }
})
```

这道题的关键是**先整理、再判断**的顺序。`"   "` 在整理前不是空字符串，去掉空格后就变成了空字符串。如果先用原始值判断是否为空再整理，`""` 键就会混进结果。把整理单个编码的规则拆成 `normalize`，“整理”和“判断是否跳过”就能自然地衔接在一个 `case` 里；整理规则变化时，也只需要改一处。

像这样从空 dict 开始、逐步累积出改变形状的转换结果的方式，在理论笔记“fold 的普适性”（fold-universality）中有更多讨论。
