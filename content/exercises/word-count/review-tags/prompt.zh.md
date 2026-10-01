在一个外卖 App 中，顾客会在每条评价里留下用逗号分隔的标签（例如 `"Fast, friendly"`）。我们想按标签统计**带有该标签的评价数**。请编写两个函数。

1. `tags_of(review)`：返回一条评价的标签列表。
   - 按逗号 `,` 拆分。
   - 去掉每个标签首尾的空格，并转成小写。
   - 整理后如果是空字符串，就丢掉。
   - 整理后同一标签出现多次时，只保留第一次出现的那个。顺序为首次出现的顺序。
2. `count_tags(reviews)`：针对所有评价，以 `Dict(String, Int)` 返回每个标签的评价数。一条评价中即使同一标签出现多次，也只计为 1。

```gleam
tags_of(" Quiet ,friendly, quiet")
// -> ["quiet", "friendly"]
count_tags(["fast,fast,clean", "Clean"])
// -> dict.from_list([#("fast", 1), #("clean", 2)])
```
