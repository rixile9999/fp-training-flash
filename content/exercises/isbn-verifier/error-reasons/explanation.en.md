In the base exercise there was only one reason for failure (`Nil`), but this time you return an `IsbnError` with a constructor for each reason. If you split the checks into step functions and chain them with `use`, the order of the lines in the code is exactly "which error gets reported first".

```gleam
use chars <- result.try(check_length(chars))    // 1. length
use values <- result.try(parse_values(chars))   // 2. characters
case checksum(values) % 11 {                    // 3. weighted sum
  0 -> Ok(values)
  _ -> Error(ChecksumMismatch)
}
```

Each step produces what the next step needs and hands it on. You need the character list that passed the length check to judge an `X` at position 9, and you need the list of character values to compute the weighted sum. So the order falls into place naturally.

In `parse_values`, `char_value` returns just a `Result(Int, Nil)` as in the base exercise, and the outer code, which knows the position and the character, makes the error detailed with `result.replace_error(InvalidCharacter(index, char))`.

There are three common mistakes.

- Counting positions in the original string. If you number the characters before removing the hyphens, the `P` in `"3-598-P1581-X"` is reported at position 6. The position in the spec is the position after removing the hyphens.
- Checking the characters first. For an 11-character input you then get a character error instead of a length error.
- Accepting `X` as 10 in any position.

The design of splitting failure reasons into types so the caller handles them with `case` is covered further in the theory note "Errors as values" (errors-as-values).
