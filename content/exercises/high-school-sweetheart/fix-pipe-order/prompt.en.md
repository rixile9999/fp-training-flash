The `initial` function in the module below returns the wrong value. `initial("Betty")` should be `"B."`, but right now it gives `"B"`, and because of that `initials` is wrong too. Fix the bug in `initial`.

- `first_letter(name)`: returns the first letter after stripping whitespace from both ends, keeping its case. (Already correct)
- `initial(name)`: uppercases the result of `first_letter` and adds `.` after it.
- `initials(full_name)`: takes a first and last name separated by a single space and joins their `initial`s with a single space. (Already correct)

```gleam
initial("  james ")        // -> "J."
initials("Linda Miller")   // -> "L. M."
```
