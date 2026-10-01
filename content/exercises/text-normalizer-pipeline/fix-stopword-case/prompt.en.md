There is a bug in the code that normalizes queries in a book search box. `normalize_query("The Art of War")` should be `["art", "war"]`, but it gives `["the", "art", "war"]`. Fix `normalize_query`.

- `split_words(text)`: splits on the space character (`" "`) and drops empty words. (Already correct)
- `remove_stopwords(words)`: removes words equal to the **lowercase** stopwords `the`, `a`, `an`, `of`. (Already correct)
- `normalize_query(text)`: splits the query into words, converts them all to lowercase, removes the stopwords, and returns the list in the original order. Stopwords must be removed regardless of letter case.

```gleam
normalize_query("AN Apple a DAY")   // -> ["apple", "day"]
```
