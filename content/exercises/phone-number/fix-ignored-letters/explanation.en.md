The bug is the single line `list.filter(is_digit)`. It throws away every character that isn't a digit, so not only the allowed separators but also typos (`a`) and stray symbols (`#`) disappear. The length check after it only sees digits, so it accepts invalid input as a valid number.

The key is to separate "characters you may throw away" from "characters you must report".

```gleam
fn extract_digits(input: String) -> Result(List(String), PhoneError) {
  input
  |> string.to_graphemes
  |> list.filter(fn(char) { !is_separator(char) })   // throw away only separators
  |> list.try_map(fn(char) {                          // everything else must be a digit
    case is_digit(char) {
      True -> Ok(char)
      False -> Error(InvalidCharacter(char))
    }
  })
}
```

With `use digits <- result.try(extract_digits(input))`, `clean` moves on to the length check only after the character check passes. That's why `"555-12x"` gives `InvalidCharacter("x")` rather than a length error.

There are three common mistakes when fixing it.

- Looking only for letters and blocking them. Symbols like `#` still disappear silently. If you go by a list of what to allow (separators and digits) instead of a list of what to block, no character slips through.
- Treating the separators as invalid characters too. Normal input like `"+1 (223) 456-7890"` gets rejected.
- Doing the existing digit count check first and adding the character check afterwards. The order of the checks then differs from the specification.

Why invalid input should be passed on as an error value instead of thrown away is covered further in the theory note "Errors are values too" (errors-as-values).
