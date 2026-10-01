答案是 `"cccbba"`。

```gleam
["a", "b", "c"]
|> list.index_map(fn(s, i) { string.repeat(s, i + 1) })  // ["a", "bb", "ccc"]
|> list.fold("", fn(acc, s) { s <> acc })
// acc: "" -> "a" -> "bba" -> "cccbba"
```

`list.fold` **从前往后**遍历列表，但函数 `s <> acc` 把新元素加在累加器的**前面**。所以越晚看到的元素，在结果中越靠前。这和把元素加在列表前面收集时顺序会反转是同一个道理。遍历的方向（fold 对 fold_right）和拼接的方向（`s <> acc` 对 `acc <> s`）是两个不同的选择，结果的顺序由两者的组合决定（理论主题“fold 的普适性”）。

常见错误有两种：一是以为 fold 从前往后遍历，结果也就从前往后排列，答成 `"abbccc"`；二是误以为 `index_map` 的索引从 1 开始，把每段的重复次数都多算一次，答成 `"ccccbbbaa"`。
