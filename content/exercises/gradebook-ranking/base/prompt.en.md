Take a list of students and build a ranking. The ranking is a list of `#(rank, name)`.

```gleam
pub type Student {
  Student(name: String, score: Int)
}
```

- Students with higher scores come first.
- On equal scores, the student whose name comes first by `string.compare` (alphabetical order) comes first.
- Ranks are assigned one by one starting from 1, in sorted order. Even students with equal scores get different ranks.

```gleam
rank([Student("Hajun", 90), Student("Minseo", 97), Student("Gaeun", 90)])
// -> [#(1, "Minseo"), #(2, "Gaeun"), #(3, "Hajun")]
```
