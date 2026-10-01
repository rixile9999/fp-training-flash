You want to normalize the subject lines of customer inquiries so they are easy to compare. Write two small functions, then chain them together to build `normalize`.

1. `strip_punctuation(text: String) -> String`
   - Remove every occurrence of exactly these four characters: `.` `,` `!` `?`. Leave all other characters as they are.
2. `collapse_spaces(text: String) -> String`
   - Split on the space character (`" "`), drop the empty pieces, and join the rest back together with single spaces. As a result, runs of spaces become one and leading and trailing spaces disappear.
3. `normalize(text: String) -> String`
   - Apply the steps in this order: trim both ends (`string.trim`, including tabs and newlines) → convert to lowercase → `strip_punctuation` → `collapse_spaces`

```gleam
strip_punctuation("Hi, there! Ok?")   // -> "Hi there Ok"
collapse_spaces("a   b  c")           // -> "a b c"
normalize("  Hello,   World!! ")      // -> "hello world"
```
