To put the position into the error, you need to know the character's position at the moment you check it. So you first attach a position to each character with `list.index_map`, and then convert with the same `list.try_map` as in the base exercise.

```gleam
|> list.index_map(fn(nucleotide, position) { #(position, nucleotide) })
|> list.try_map(fn(pair) {
  let #(position, nucleotide) = pair
  complement(nucleotide)
  |> result.replace_error(InvalidNucleotide(position, nucleotide))
})
```

`complement` still returns `Result(String, Nil)`, because the rule for a single nucleotide does not need to know the position. The position is attached outside, when `result.replace_error` turns the error into a more detailed value. The small function produces a simple error, and the side that knows the context enriches it.

The requirement "the first error" is met automatically, because `try_map` stops at the first `Error`.

There are two common mistakes.

- Counting the position from 1. The position that `index_map` gives starts from 0, so you can use it as is.
- Accumulating by hand with `list.fold` or `list.index_fold` and overwriting the error every time something fails. Then the last error is the one that remains. An accumulator that is already an `Error` must not change any more, but when you write that rule by hand it is easy to forget. With `try_map` or `try_fold`, you do not have to write that rule yourself.

Making the error a custom type that carries the information you need is covered further in the theory note "Errors are values too" (errors-as-values).
