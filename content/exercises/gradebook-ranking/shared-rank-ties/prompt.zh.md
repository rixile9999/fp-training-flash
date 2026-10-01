制作校内竞赛的排名表。排名表是 `#(名次, 姓名)` 的列表。这一次，**同分者获得相同的名次**。

```gleam
pub type Student {
  Student(name: String, score: Int)
}
```

- 分数高的学生排在前面；分数相同时，按 `string.compare` 姓名靠前（字典序）的学生排在前面。
- 分数相同的学生获得相同的名次。
- 一个学生的名次是“分数比自己高的学生人数 + 1”。因此紧跟在同分之后的名次要跳过同分人数（1、2、2、4 的方式）。

```gleam
rank([
  Student("Doyun", 88),
  Student("Gaeun", 95),
  Student("Harin", 95),
  Student("Narae", 70),
])
// -> [#(1, "Gaeun"), #(1, "Harin"), #(3, "Doyun"), #(4, "Narae")]
```
