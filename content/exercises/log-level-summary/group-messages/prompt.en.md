To help analyze an outage, take a list of log lines and return a dictionary that collects the messages into a list for each level.

- If a line starts with `[` and has a `]` after it, the text between the leading `[` and the **first** `]` is the level. Convert the level to uppercase.
- The message is all the text after the first `]` with **only leading whitespace** removed. If the message contains `[` or `]`, leave them as they are.
- Leave out lines that don't start with `[` or have no `]`.
- Each level's message list keeps the order in which the messages appeared in the log. The result contains only levels that appear at least once.

```gleam
messages_by_level([
  "[ERROR] Disk full",
  "[info] Restart requested",
  "[ERROR]   Retry failed [3 times]",
])
// -> dict.from_list([
//   #("ERROR", ["Disk full", "Retry failed [3 times]"]),
//   #("INFO", ["Restart requested"]),
// ])
```
