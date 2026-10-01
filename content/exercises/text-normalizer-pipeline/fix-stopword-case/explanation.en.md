Each step function is correct. The problem is the **order in which they are connected**. `remove_stopwords` compares against lowercase words, but the original pipeline called it before converting to lowercase. `"The"` is not equal to `"the"`, so it survived, and was lowercased afterwards, showing up in the result as `"the"`.

```gleam
text
|> split_words
|> list.map(string.lowercase)
|> remove_stopwords
```

Just swapping the two steps means `remove_stopwords` always receives lowercase words. In a pipeline, the shape of input a later step expects (here, "lowercase words") defines what the earlier steps are responsible for.

A common wrong fix is to add uppercase forms such as `"The"` and `"A"` to the stopword list. The `"The Art of War"` from the bug report then passes, but other combinations of case such as `"AN"` or `"oF"` still remain. Rather than blocking symptoms one at a time, fixing the cause means putting a step that brings everything to one form (normalization) before the comparison.

Every step is a pure function, so changing the order affects nothing else, and if you write down each step's intermediate result you can see right away where the value goes wrong. See the theory note "Function composition and pipelines".
