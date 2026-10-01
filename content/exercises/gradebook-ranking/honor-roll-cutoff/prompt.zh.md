制作期末优等生名单。接收学生列表和人数 `n`，返回分数最高的前 `n` 名学生的姓名。不过，不能把分界处的同分者排除在外。

```gleam
pub type Student {
  Student(name: String, score: Int)
}
```

- 学生按分数降序排列；分数相同时，按 `string.compare` 姓名靠前（字典序）的排在前面。
- 从前面选出 `n` 名。如果后面还有与第 `n` 名学生分数相同的学生，也全部列入。
- `n` 小于等于 0 时返回空列表，`n` 大于学生人数时返回所有学生。
- 结果是按上述排列顺序的姓名列表。

```gleam
honor_roll(
  [Student("Chaewon", 88), Student("Ara", 97), Student("Bomin", 88), Student("Dahee", 75)],
  2,
)
// -> ["Ara", "Bomin", "Chaewon"]
```
