The lab has asked for help: with only `Error(Nil)`, it is hard to find where a long DNA sequence went wrong. Implement `to_rna` again so that the error carries the position and the character.

```gleam
pub type TranscriptionError {
  InvalidNucleotide(position: Int, found: String)
}

pub fn to_rna(dna: String) -> Result(String, TranscriptionError)
```

- The conversion rule is the same: `G`→`C`, `C`→`G`, `T`→`A`, `A`→`U`. Join the results in input order and wrap them in `Ok`. An empty string gives `Ok("")`.
- If there is a character that is not one of the four uppercase letters, return `Error(InvalidNucleotide(position, found))`.
  - `position` is the position of that character, counted **from 0**.
  - `found` is the character itself.
  - If there are several invalid characters, report the first one (the one with the smallest position).

```gleam
to_rna("ACGT")   // -> Ok("UGCA")
to_rna("ACXT")   // -> Error(InvalidNucleotide(position: 2, found: "X"))
```
