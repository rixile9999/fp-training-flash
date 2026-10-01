The solution is a four-step pipeline: split into lines → attach numbers → filter out blank lines → interpret each line.

**The order matters for numbering and filtering.** The numbers must refer to the original file, so build `#(number, line)` pairs with `list.index_map` before filtering. If you number after filtering, every line after a blank line gets the wrong number.

`list.try_map` in the last step is "a map where interpreting each line can fail". If every line is `Ok`, you get `Ok(list)` with the values collected in order; as soon as an `Error` appears, it stops there. This shape, which flips `List(Result(a, e))` into `Result(List(a), e)`, is the traversal (traverse) covered in the topic **Chaining Results and monads (chaining-results-monads)**.

The `ParseError` from `parse_line` has no line number. Adding context to the error with `result.map_error(LineError(line_number, _))` lets you wrap a lower-level error in a higher-level error type without throwing it away (the topic **Errors are values too**). From `LineError(3, InvalidOrderId("x"))` alone, the caller knows which field on which line was wrong.

Common mistakes:

- Filtering blank lines first and numbering afterwards, so the line numbers drift.
- Using `index` as is, so counting starts from 0.
- Not filtering blank lines, so the newline at the end of the file causes a `WrongFieldCount(1)` error.
