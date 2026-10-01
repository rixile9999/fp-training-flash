There is a bug in `exciting_list`, written by a colleague. Fix it so that it follows the rules.

`exciting_list(languages)` must return `True` if one of the following holds, and `False` otherwise.

- The first language is `"Gleam"`. (The length of the list does not matter.)
- The second language is `"Gleam"`, and the list has length 2 or 3.

An empty list is `False`. The current code returns the wrong value in at least two cases.

```gleam
exciting_list(["Gleam"])
// expected: True
exciting_list(["Elm", "Gleam", "C#", "Scheme"])
// expected: False
```
