把“处理单条评价”和“整体汇总”分开，每一部分就都变简单了。

```gleam
pub fn tags_of(review: String) -> List(String) {
  review
  |> string.split(",")
  |> list.map(normalize)                 // 去掉空白 + 转小写
  |> list.filter(fn(tag) { tag != "" })  // 丢掉空标签
  |> list.unique                         // 去除评价内的重复
}

pub fn count_tags(reviews: List(String)) -> Dict(String, Int) {
  reviews
  |> list.flat_map(tags_of)
  |> list.fold(dict.new(), increment)
}
```

要统计的不是“标签出现的次数”，而是“带有该标签的评价数”，所以先按评价去重，再把所有评价的标签连接起来计数。如果对整个 `count_tags` 去重，分布在多条评价中的正常出现也会消失，所以去重必须在单条评价内部进行。

步骤的顺序也很重要。`"Fast"` 和 `" fast"` 在整理之前是不同的字符串，如果先去重再整理，两者都会留下来。过滤空标签也必须放在整理之后，才能丢掉 `" "` 这样的标签。在管道中保持“整理 -> 判断”的顺序，是本题最容易出错的地方。

如果用 `set.from_list` 和 `set.to_list` 去重，首次出现的顺序就会丢失。`tags_of` 必须保持顺序，所以使用能保持顺序的 `list.unique`。

把小转换按顺序组合的观点在理论笔记 function-composition-pipelines（函数组合与管道）中讨论，把列表折叠成 dict 来计数的方式在 fold-universality（fold 的普适性）中讨论。
