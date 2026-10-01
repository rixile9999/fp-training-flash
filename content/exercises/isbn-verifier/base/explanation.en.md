`is_valid` is a **total function** that must answer for any string. Yet inside it, "turning a character into a number" is a partial operation that can fail. The solution is to receive the part that can fail as a `Result`, handle it, and turn it into a `Bool` only once, at the outermost level.

The code splits into two steps.

- **Parsing** `parse(isbn) -> Result(List(Int), Nil)`: remove the hyphens, check that the length is 10, and compute the value of each character. `char_value` accepts `X` as 10 only at position 9 and leaves everything else to `int.parse`. `list.try_map` returns `Error(Nil)` at the first failure, so a single invalid character makes the whole parse fail.
- **Calculation** `checksum(values)`: takes just the list of values and computes the weighted sum. Here you can trust that the input is already valid.

```gleam
case parse(isbn) {
  Ok(values) -> checksum(values) % 11 == 0
  Error(Nil) -> False
}
```

There are three common mistakes.

- Turning a character that failed to parse into 0, as in `result.unwrap(int.parse(char), 0)`. It does not crash, but it judges an invalid input whose weighted sum happens to work out, such as `3-598-P1581-X`, as `True`. Covering a failure with a default value turns a "total function" into "a function that gives wrong answers".
- Accepting `X` as 10 regardless of its position. `X` only has meaning in the check-digit position.
- Leaving out the length check. The empty string has a weighted sum of 0, which is divisible by 11, so you get `True`.

If you write `let assert Ok(d) = int.parse(char)`, the program crashes on an invalid character. Why you should expose the possibility of failure in the types and handle it all the way through is covered further in the theory note "Total and partial functions" (total-vs-partial-functions).
