A problem was found in the analysis pipeline: RNA sequences come out shorter than the original DNA. That is because `to_rna` silently throws away invalid characters instead of reporting them as errors. Fix the code.

The correct behavior is as follows.

- Replace `G`→`C`, `C`→`G`, `T`→`A`, `A`→`U`, join in input order, and wrap in `Ok`. An empty string gives `Ok("")`.
- If there is even one character that is not one of the four uppercase letters, return `Error(Nil)`.

```gleam
to_rna("ACGT")  // -> Ok("UGCA")
to_rna("ACXT")  // -> Error(Nil)   (right now it gives Ok("UGA"))
```
