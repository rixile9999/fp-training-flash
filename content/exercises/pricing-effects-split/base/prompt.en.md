The store register's `checkout` prints receipt lines with `io.println` right in the middle of calculating the total. That makes the receipt contents impossible to test. Separate the calculation from the output. The three functions below **print nothing** and only return values.

1. `line_log(item: Item) -> String`
   - A string of the form `"<name> x<quantity> = <price * quantity>"`. Example: `"apple x3 = 3000"`
2. `quote(items: List(Item)) -> Quote`
   - `total`: the sum of `price * quantity` over all items
   - `log`: a list with the `line_log` result for each item **in input order**, followed by one final line `"합계 = <total>"`
   - With no items: `Quote(total: 0, log: ["합계 = 0"])`
3. `render(quote: Quote) -> String`
   - The lines of `log` joined with `"\n"`. Do not add a newline after the last line.

`합계` is Korean for "Total". The tests compare the text exactly, so write `"합계 = "` as it is.

Change `checkout` into a thin function that calls `quote` and `render`, prints once, and returns `total` (not tested).

```gleam
quote([Item("apple", 1000, 3), Item("pear", 2500, 2)])
// -> Quote(total: 8000, log: ["apple x3 = 3000", "pear x2 = 5000", "합계 = 8000"])
```
