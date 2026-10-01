`parse_setting` reads one line of a settings file, `"key=value"`. Its return type is `Result`, yet when it meets an invalid line the process dies on `let assert`. A single typo in the settings file keeps the server from starting.

Remove the `let assert`s and fix it so that invalid input is returned as a `SettingError` value.

```gleam
pub type SettingError {
  MissingEquals(line: String)
  NotANumber(value: String)
}
```

- If there is no `=`, `Error(MissingEquals(whole line))`.
- Split the key and the value at the first `=`. If the value is not an integer, `Error(NotANumber(value))`. An empty value is not an integer either.
- Do not strip whitespace. Results for valid lines stay as they are now.
- Do not use `let assert` or `panic`.

```gleam
parse_setting("retries=3")      // -> Ok(Setting("retries", 3))
parse_setting("retries=three")  // now: crash   after the fix: Error(NotANumber("three"))
```
