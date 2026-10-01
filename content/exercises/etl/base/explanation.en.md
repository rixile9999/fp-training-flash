One entry of the input (one score) spreads out into several entries of the result (one per letter). Since the transformation changes the shape, you cannot build it with a structure-preserving operation like `dict.map_values`; the right tool is a fold that starts from an empty dict and adds entries one at a time.

```gleam
dict.fold(legacy, dict.new(), fn(result, score, letters) {
  list.fold(letters, result, fn(acc, letter) {
    dict.insert(acc, string.lowercase(letter), score)
  })
})
```

The outer fold goes over each score, and the inner fold over each letter of that score. What matters is that the inner fold starts from the outer accumulator, `result`. If it started from a new dict, the letters inserted for earlier scores would disappear. For an empty list the inner fold never runs, so it needs no special handling.

Common mistakes are leaving out the lowercase conversion, or inserting only the first letter of the list, as in `case letters { [first, ..] -> ... }`.

The distinction "a transformation that keeps the shape is a map; one that changes the shape and builds up a new value is a fold" is covered in the theory notes "Structure-preserving transformations: functors" and "The universality of fold" (fold-universality).
