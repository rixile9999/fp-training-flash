Implement `to_rna(dna: String) -> Result(String, Nil)`, which takes a DNA strand and returns the transcribed RNA strand.

A DNA strand is a string made of the uppercase letters `G`, `C`, `T` and `A`. Replacing each nucleotide with the partner below gives the RNA.

| DNA | RNA |
|---|---|
| `G` | `C` |
| `C` | `G` |
| `T` | `A` |
| `A` | `U` |

- Wrap the string, joined in the same order as the input, in `Ok`. An empty string gives `Ok("")`.
- If there is even one character that is not one of these four uppercase letters (a lowercase letter, a space, `U` and so on), return `Error(Nil)`.

```gleam
to_rna("ACGT")  // -> Ok("UGCA")
to_rna("ACXT")  // -> Error(Nil)
```
