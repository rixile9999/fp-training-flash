The four functions build on one another in a single chain. `clean_word` owns the rule for a single word, `to_words` owns the rule for the whole sentence, and `slugify` and `short_slug` only decide how to join the result of `to_words`.

```gleam
text
|> string.split(" ")
|> list.map(clean_word)
|> list.filter(fn(word) { word != "" })
```

The trap in this exercise is **where the filtering goes**. Pieces such as `"-"` or `"&"` are not empty right after splitting; they only become empty strings after going through `clean_word`. So the `list.filter` that drops empty words must come **after** the cleaning. Put it before, and hyphens pile up, as in `"fresh-apples-5kg--sale"`. Put it after, and the same filter also takes care of the empty pieces produced by consecutive spaces, so a single rule covers everything.

For the same reason, `short_slug` must reuse `to_words` too. If you cut with `list.take` right after splitting the original text, pieces made only of symbols also count as words, and you end up with too few words. The requirement is to pick from the list of "cleaned words", so just take the result of `to_words`, which has already finished cleaning, and apply `list.take`. `list.take` returns an empty list when the count is 0 or less and the whole list when the count exceeds its length, so no separate edge-case handling is needed.

Even with the same step functions, changing the order of composition gives you a different function. See the theory note "Function composition and pipelines".
