Build the end-of-term honor roll. Take a list of students and a count `n`, and return the names of the top `n` students by score. However, no one tied at the cutoff is left out.

```gleam
pub type Student {
  Student(name: String, score: Int)
}
```

- Line the students up by score in descending order; on equal scores, the name that comes first by `string.compare` (alphabetical order) goes first.
- Pick the first `n` students. If more students further down have the same score as the `n`-th student, include all of them too.
- If `n` is 0 or less, return an empty list; if `n` is larger than the number of students, return every student.
- The result is the list of names in that lined-up order.

```gleam
honor_roll(
  [Student("Chaewon", 88), Student("Ara", 97), Student("Bomin", 88), Student("Dahee", 75)],
  2,
)
// -> ["Ara", "Bomin", "Chaewon"]
```
