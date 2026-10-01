接收学生列表，生成排名表。排名表是 `#(名次, 姓名)` 的列表。

```gleam
pub type Student {
  Student(name: String, score: Int)
}
```

- 分数高的学生排在前面。
- 分数相同时，按 `string.compare` 姓名靠前（字典序）的学生排在前面。
- 名次按排好的顺序从 1 开始逐个标上。即使分数相同，名次也互不相同。

```gleam
rank([Student("Hajun", 90), Student("Minseo", 97), Student("Gaeun", 90)])
// -> [#(1, "Minseo"), #(2, "Gaeun"), #(3, "Hajun")]
```
