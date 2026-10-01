In the original code, `char_value` returns an `Int`, so it has no way to express "the conversion failed". That is why it ignored failure with `let assert Ok(digit) = int.parse(char)`, and the program crashed the moment the conversion failed. Through its type `String -> Bool`, `is_valid` promises to "answer for every string", but in reality it was a partial function that answered only for some inputs.

The fixed code exposes the possibility of failure in its type.

```gleam
fn char_value(char: String, index: Int) -> Result(Int, Nil) {
  case char, index {
    "X", 9 -> Ok(10)
    _, _ -> int.parse(char)
  }
}
```

In `is_valid`, gather the `List(Result(Int, Nil))` you get from `list.index_map(chars, char_value)` with `result.all`. If all are `Ok`, you get the list of values; if even one is an `Error`, you get `Error(Nil)`. Split that result with `case` and return `False` on `Error`, and a failure becomes an ordinary answer instead of a crash.

There are two mistakes that often creep in during the fix.

- Switching to `result.unwrap(int.parse(char), 0)`. It no longer crashes, but it computes an invalid character as 0, so it judges an input whose weighted sum happens to work out, such as `3-598-P1581-X`, as `True`. Instead of crashing, it gives a wrong answer.
- Accepting `X` as 10 regardless of position while rewriting `char_value`.

Use `let assert` only when you can prove that "this can never fail here". Where failure happens as a matter of course, as with user input, handle it with `Result`. This distinction is covered further in the theory note "Total and partial functions" (total-vs-partial-functions).
