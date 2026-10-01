The lab wants to transcribe the DNA of several samples in one go. `to_rna(dna: String) -> Result(String, Nil)`, which transcribes a single sample, is already implemented (with the same rules as the base exercise). Use it to implement `transcribe_samples`.

```gleam
pub type Sample {
  Sample(id: String, dna: String)
}

pub fn transcribe_samples(
  samples: List(Sample),
) -> Result(List(#(String, String)), String)
```

- If the DNA of every sample is valid, return a list of `#(sample id, RNA)` pairs in the same order as the input, wrapped in `Ok`. With no samples, the result is `Ok([])`.
- A sample whose DNA is an empty string is also valid (`to_rna("")` is `Ok("")`).
- If `to_rna` fails for some sample, return that sample's `id` as `Error`. If there are several, return the `id` of the sample that comes first in the list.

```gleam
transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GG")])
// -> Ok([#("S1", "UGCA"), #("S2", "CC")])

transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GXG")])
// -> Error("S2")
```
