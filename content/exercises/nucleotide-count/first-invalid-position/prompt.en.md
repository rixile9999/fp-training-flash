Take a DNA sequence and count the four nucleotides `A`, `C`, `G` and `T`, but if there is an invalid letter, report **what** went wrong **and where**.

```gleam
pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}
```

- If every letter is an uppercase `A`, `C`, `G` or `T`, return `Ok(counts)`. `counts` always contains the four keys (a missing nucleotide is 0).
- If there is any other letter (including lowercase), return `Error(InvalidNucleotide(letter, index))`. `index` is the position counted from 0.
- If there are several invalid letters, report **the one that comes first**.

```gleam
nucleotide_count("GATXACZ")
// -> Error(InvalidNucleotide("X", 3))
```
