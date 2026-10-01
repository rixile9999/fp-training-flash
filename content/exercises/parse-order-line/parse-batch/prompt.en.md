The module already has `parse_line`, which interprets one order line `"order_id,sku,quantity"` (an `OrderLine` on success, a `ParseError` on failure). Using it, implement `parse_batch`, which interprets a whole order file made of many lines.

```gleam
// Provided
pub fn parse_line(line: String) -> Result(OrderLine, ParseError)

// What you write
pub type BatchError {
  LineError(line_number: Int, error: ParseError)
}

pub fn parse_batch(text: String) -> Result(List(OrderLine), BatchError)
```

- Split the text on newlines (`"\n"`).
- Skip lines that are empty after trimming the surrounding whitespace. An empty string gives `Ok([])`.
- If every line succeeds, return `Ok(list)` in the line order of the file.
- If any line fails, return `Error(LineError(line number, the error from parse_line))` for the earliest failing line.
- Line numbers count from 1, and skipped blank lines are included in the numbering (the line number in the original file).

```gleam
parse_batch("1001,APPLE-01,3\n\nx,PEAR-02,1")
// -> Error(LineError(3, InvalidOrderId("x")))
```
