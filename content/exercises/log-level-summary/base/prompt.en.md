Take a list of server log lines, count how many lines there are for each log level, and return the counts as a dictionary.

- If a line starts with `[` and has a `]` after it, the text between the leading `[` and the **first** `]` is the level. Everything after `]` is the message and can be anything (there doesn't have to be a space).
- Convert the level to uppercase before counting. `[warn]` and `[WARN]` are the same level.
- Lines that don't start with `[` or have no `]` are not counted.
- The result contains only levels that appear at least once.

```gleam
count_levels([
  "[INFO] Server started",
  "[warn] Response delayed 1200ms",
  "Cache initialized",
  "[INFO] Request handled",
])
// -> dict.from_list([#("INFO", 2), #("WARN", 1)])
```
