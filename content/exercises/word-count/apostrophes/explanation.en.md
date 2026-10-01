An apostrophe plays two roles. The apostrophe in `don't` is part of the word, and the apostrophes in `'large'` are quote marks. You can't tell them apart by the character alone, but you can by **position**: in the middle of a word it's a contraction, and at the very start or end of a piece it's a quote mark.

So split the processing into two steps.

1. `tokens`: treat apostrophes as word characters and split only on the other separators. At this step, `'can't'` stays as one piece.
2. `trim_quotes`: strip only the apostrophes at either end of a piece.

```gleam
token
|> string.to_graphemes
|> list.drop_while(fn(g) { g == "'" })   // remove leading quotes
|> list.reverse
|> list.drop_while(fn(g) { g == "'" })   // remove trailing quotes
|> list.reverse
|> string.concat
```

A piece that was only quotes, like a single `'` or `''`, becomes an empty string after cleanup, so you need to filter once more before counting. There are two common mistakes.

- Treating apostrophes as separators from the start, so `don't` gets split into `don` and `t`.
- Not stripping the quotes at either end, so `'large'` and `large` are counted as different words.

If you split the problem into independent small functions, "splitting" and "cleaning up pieces", you can test each one separately, and `count_words` becomes a pipeline that connects them. This style of composition is covered in the theory note function-composition-pipelines (Function composition and pipelines), and the final counting step in fold-universality (The universality of fold).
