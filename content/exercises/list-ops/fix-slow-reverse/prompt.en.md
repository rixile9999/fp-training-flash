To show the newest logs at the top, a log viewer reverses its list of log lines with `reverse` from the module below. The result is correct, but there are reports that the screen freezes once the log goes past 200,000 lines. Fix `reverse` so that it finishes in time proportional to the length of the list.

- `reverse(list)` returns a new list with the elements in reverse order, as it does now.
- Do not use `gleam/list`. `append` and `foldl` in the module are used elsewhere too, so their behavior must not change.

```gleam
reverse(["09:00 started", "09:01 order received", "09:02 payment completed"])
// -> ["09:02 payment completed", "09:01 order received", "09:00 started"]
// Now: the result is the same, but it exceeds the time limit at 200,000 lines.
```
