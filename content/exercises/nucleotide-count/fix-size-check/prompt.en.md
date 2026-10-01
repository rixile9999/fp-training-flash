The `nucleotide_count` below counts the `A`, `C`, `G` and `T` in a DNA sequence, but it gives wrong results for some inputs. Fix it so it follows the rules.

- The result is `Ok(counts)`, and `counts` always contains the four keys `"A"`, `"C"`, `"G"` and `"T"`, including nucleotides that never appear.
- Only uppercase `A`, `C`, `G` and `T` are valid. If there is even one other letter, return `Error(Nil)`.
- The empty string is valid, and all four nucleotides have a count of 0.

This is how the current code behaves.

```gleam
nucleotide_count("GATTACA")  // -> Ok(A: 3, C: 1, G: 1, T: 2)  (correct)
nucleotide_count("AAX")      // -> Ok(A: 2, X: 1)  (should be Error(Nil))
nucleotide_count("")         // -> Ok(empty dictionary)  (all four nucleotides should be 0)
```
