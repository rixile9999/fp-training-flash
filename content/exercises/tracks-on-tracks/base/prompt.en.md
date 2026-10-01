Write four functions that manage a list of programming languages you want to learn. The list is a `List(String)`.

1. `add_language(languages, language)`: return the list with the new language added to the **front**.
2. `count_languages(languages)`: return the number of languages in the list.
3. `reverse_list(languages)`: return the list in reverse order.
4. `exciting_list(languages)`: return `True` if one of the following holds, and `False` otherwise.
   - The first language is `"Gleam"`. (The length does not matter.)
   - The second language is `"Gleam"`, and the list has length 2 or 3.

An empty list is not exciting. A language name counts only if it is exactly `"Gleam"`, including case.

```gleam
add_language(["OCaml", "Elixir"], "Scheme")
// -> ["Scheme", "OCaml", "Elixir"]

exciting_list(["Lua", "Gleam", "Go"])
// -> True
exciting_list(["Lua", "Gleam", "Go", "Elm"])
// -> False
```
