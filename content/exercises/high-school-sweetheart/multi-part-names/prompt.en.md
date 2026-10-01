Extend the initials feature so it also handles names with a middle name or uneven spacing. `first_letter` and `initial` are already implemented in the starter code.

1. `name_parts(full_name: String) -> List(String)`
   - Return the list of words you get by splitting the name on spaces (`" "`), in their original order.
   - Don't include empty words (`""`) created by leading or trailing spaces or repeated spaces.
2. `initials(full_name: String) -> String`
   - Apply `initial` to every word from `name_parts` and join them with a single space.
   - If there are no words at all, return `""`.
3. `monogram(full_name: String) -> String`
   - Take the first letter of every word from `name_parts` in uppercase and write them together with no spaces.

```gleam
name_parts("  mary   jane watson ")   // -> ["mary", "jane", "watson"]
initials("  mary   jane watson ")     // -> "M. J. W."
monogram("grace brewster hopper")     // -> "GBH"
```
