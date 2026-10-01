The original `checkout` did "calculate the total" and "print the receipt" together inside one `fold`. Printing is an **effect** that changes the world outside the function, so testing this function would mean intercepting the characters printed on the screen. The solution is to **return what should be printed as a value**.

- `line_log`, `quote` and `render` are pure functions that take values and return values. For the same input they give the same result whenever you call them, so you can check them directly with `should.equal`.
- `checkout` becomes a three-line shell that calls `quote` → `render` → `io.println` in order. The effect lives on that one line only, and there is no logic in it to check.

If you build the log of `quote` with `list.map(items, line_log)`, the input order is preserved as is. A common mistake is building the total and the log at the same time in a single `fold` like the original code, prepending with `[line, ..lines]`. Prepending stacks the list in reverse, so you have to reverse it at the end, and if you forget, the receipt order is flipped. Computing the total and the log separately leaves no room for this mistake.

If `render` builds up `acc <> line <> "\n"` with a `fold`, a newline is added after the last line too. "Put it only in between" is exactly what `string.join` does.

The structure of keeping calculation in a pure core and effects in a thin outer layer is covered in more depth in the theory note "Separating computation from effects".
