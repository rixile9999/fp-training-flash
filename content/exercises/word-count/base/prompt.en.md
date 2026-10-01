Write `count_words(input)`, which counts how many times each word appears in an English sentence (ASCII characters only). The result is a `Dict(String, Int)`.

- A word is a run of consecutive letters (`a`-`z`, `A`-`Z`) and digits (`0`-`9`). A run made only of digits is also a word.
- Every other character (spaces, newlines, tabs, punctuation, apostrophes and so on) is a separator that splits words and does not remain in the result.
- Case doesn't matter, and the keys of the result are written in lowercase.
- If there are no words at all, return an empty dict.

`is_word_char`, which checks whether a single character is a lowercase letter or a digit, is already written.

```gleam
count_words("Go, go\tSTOP!")
// -> dict.from_list([#("go", 2), #("stop", 1)])
```
