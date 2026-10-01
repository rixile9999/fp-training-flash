Build the ranking for a school competition. The ranking is a list of `#(rank, name)`. This time, **tied students get the same rank**.

```gleam
pub type Student {
  Student(name: String, score: Int)
}
```

- Students with higher scores come first; on equal scores, the student whose name comes first by `string.compare` (alphabetical order) comes first.
- Students with equal scores get the same rank.
- A student's rank is "the number of students with a higher score + 1". So the rank right after a tie skips ahead by the number of tied students (the 1, 2, 2, 4 style).

```gleam
rank([
  Student("Doyun", 88),
  Student("Gaeun", 95),
  Student("Harin", 95),
  Student("Narae", 70),
])
// -> [#(1, "Gaeun"), #(1, "Harin"), #(3, "Doyun"), #(4, "Narae")]
```
