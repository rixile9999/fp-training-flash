You're counting how many times each word appears in English drama subtitles (ASCII characters only). The subtitles mix contractions like `don't` and `you're` with quotations wrapped in apostrophes, like `'large'`. Write three functions.

1. `tokens(text)`: the list of pieces you get by splitting on characters that are **not** letters, digits or apostrophes (`'`). Don't include empty pieces. Don't change the case.
2. `trim_quotes(token)`: removes all apostrophes stuck to the front and back of a piece, however many there are. Apostrophes in the middle stay.
3. `count_words(input)`: lowercase the input, split it with `tokens`, clean up each piece with `trim_quotes`, and return the count for each word as a `Dict(String, Int)`. If a cleaned-up piece is an empty string, it is not a word.

`is_word_char`, which checks whether a single character is a letter or a digit, is already written.

```gleam
tokens("Joe can't,\n'stop'!")
// -> ["Joe", "can't", "'stop'"]
count_words("can, can't, 'can't'")
// -> dict.from_list([#("can", 1), #("can't", 2)])
```
