The rule for converting a single character has four successes and one "any other character fails". If you pull this rule out into a `complement(nucleotide) -> Result(String, Nil)` function, the fact that it can fail shows up in the return type, and you can check the rule on its own.

The whole strand "succeeds only if every character succeeds". That is exactly the definition of `list.try_map`.

```gleam
dna
|> string.to_graphemes
|> list.try_map(complement)      // Result(List(String), Nil)
|> result.map(string.concat)     // Result(String, Nil)
```

`try_map` stops at the first `Error` and returns that `Error`. The converted list comes out as `Ok` only when everything succeeded, so you connect the final join with `result.map` so that it only happens on success. An empty string has no characters, so it has no character that could fail, and the result is `Ok("")`.

The most common mistake is using `list.filter_map`. `filter_map` **throws away** the elements that failed and keeps the rest, so `"ACGTX"` becomes `Ok("UGCA")`, and invalid input looks like a perfectly fine result. "Filtering out failures" and "reporting failures" are completely different requirements.

Converting the input to uppercase first is also a mistake that widens the rule. The exercise defines only the four uppercase letters as valid input, so instead of quietly fixing lowercase letters, you must report them as errors.

The design of reporting invalid input through the result type is covered further in the theory note "Errors are values too" (errors-as-values).
