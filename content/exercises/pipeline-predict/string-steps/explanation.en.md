The answer is `[6, 5, 5]`.

```gleam
"  Hello, Gleam World  "
|> string.trim             // "Hello, Gleam World"
|> string.lowercase        // "hello, gleam world"
|> string.split(" ")       // ["hello,", "gleam", "world"]
|> list.map(string.length) // [6, 5, 5]
```

Because `string.trim` removed the whitespace at both ends first, the result of `split` contains no empty strings. Had the order been swapped so that `split` ran first, empty pieces would have been mixed in, as in `["", "", "Hello,", ...]`. In a pipeline, the order of the steps changes the result (theory topic "Function composition and pipelines").

A common mistake is to forget the comma, count the length of `"hello"` as 5 and answer `[5, 5, 5]`. `split` only splits on the separator (a space) and does not remove punctuation, so the first piece is `"hello,"` (6 characters).
