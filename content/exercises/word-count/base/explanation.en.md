If you split the problem into five small transformations, each step does only one thing.

```gleam
input
|> string.lowercase                  // 1. normalize case
|> string.to_graphemes               // 2. into a list of characters
|> list.map(fn(g) { case is_word_char(g) { True -> g  False -> " " } })
|> string.concat                     //    turn every separator into a single space
|> string.split(" ")                 // 3. split
|> list.filter(fn(word) { word != "" })  // 4. drop empty pieces
|> list.fold(dict.new(), increment)  // 5. count
```

- There are several kinds of separators (commas, colons, newlines and so on), so `string.split(" ")` alone can't split `"one,two"`. If you turn every separator into a space, a single split is enough.
- When separators are consecutive or sit at either end of the string, `split` produces empty string pieces. If you don't filter them out, `""` gets counted as a word. This is the most common mistake.
- If lowercasing comes first, every later step deals only with lowercase, so `is_word_char` only has to check lowercase letters.

Counting is a fold that turns a list into a single dict. Using `dict.upsert` with `option.unwrap(previous, 0) + 1` in `increment` handles new words and already-seen words with one expression.

Building the whole thing by piping small transformations together is covered in the theory note function-composition-pipelines (Function composition and pipelines), and folding a list into a dict is covered in fold-universality (The universality of fold).
