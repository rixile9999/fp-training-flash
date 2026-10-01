The whole batch "succeeds only if every sample succeeds, and otherwise gives the first failure". You can reuse the `list.try_map` you applied to a list of characters in the base exercise, this time one level up, on the list of samples.

```gleam
list.try_map(samples, transcribe_sample)

fn transcribe_sample(sample: Sample) -> Result(#(String, String), String) {
  to_rna(sample.dna)
  |> result.map(fn(rna) { #(sample.id, rna) })
  |> result.replace_error(sample.id)
}
```

The error of `to_rna` is `Nil`, so it does not know "which sample was wrong". The one that knows is the outer function holding the sample, so the outside uses `result.replace_error(sample.id)` to turn the error into a more useful value. The success value is likewise turned into an `#(id, rna)` pair with `result.map`. With a separate function that handles one sample, the part you pass to `try_map` fits on one line, and you can check the rule for a single sample on its own.

There are two common mistakes.

- Collecting only the successful samples with `list.filter_map`. Invalid samples quietly drop out of the result, and the caller never learns that samples went missing.
- Accumulating by hand with `list.fold` and overwriting with `Error(sample.id)` every time something fails. Then the last failed sample is reported. `try_map` stops at the first failure, so it leaves no room for this mistake.

Building bigger `Result` functions out of small ones is covered further in the theory note "Errors are values too" (errors-as-values).
