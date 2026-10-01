Write four functions that make an initials heart for a high school couple to post on social media. Each later function must reuse the functions you wrote before it.

1. `first_letter(name: String) -> String`
   - Strip spaces, tabs and newlines from both ends of the name, then return the first letter **with its case unchanged**.
   - If the stripped result is an empty string, return `""`.
2. `initial(name: String) -> String`
   - Uppercase the result of `first_letter` and add `.` after it.
3. `initials(full_name: String) -> String`
   - Take a first name and last name separated by a single space (e.g. `"Lance Green"`) and join each one's `initial` with a single space.
4. `pair(full_name1: String, full_name2: String) -> String`
   - Return `heart_top <> first person's initials <> "  +  " <> second person's initials <> heart_bottom`.
   - The heart-shaped strings `heart_top` and `heart_bottom` are already in the starter code as constants.

```gleam
first_letter("\n  jane ")   // -> "j"
initial("robert")          // -> "R."
initials("Lance Green")    // -> "L. G."
```

The middle line of `pair("Blake Miller", "Riley Lewis")` becomes `**     B. M.  +  R. L.     **`.
