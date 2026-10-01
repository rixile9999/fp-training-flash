Take a DNA sequence as a string, count how many of each of the four nucleotides `A`, `C`, `G` and `T` it contains, and return the counts as a dictionary.

- The result is `Ok(counts)`, and `counts` always contains the four keys `"A"`, `"C"`, `"G"` and `"T"`, including nucleotides that never appear.
- Only uppercase `A`, `C`, `G` and `T` are valid letters. If there is even one lowercase or other letter, return `Error(Nil)`.
- The empty string is valid, and all four nucleotides have a count of 0.

```gleam
nucleotide_count("GATTACA")
// -> Ok(dict.from_list([#("A", 3), #("C", 1), #("G", 1), #("T", 2)]))

nucleotide_count("GATXACA")
// -> Error(Nil)
```
