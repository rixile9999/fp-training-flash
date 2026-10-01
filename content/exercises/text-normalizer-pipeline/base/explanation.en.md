`normalize` is nothing more than a pipeline connecting four steps; the actual rules live in each step function.

```gleam
text
|> string.trim
|> string.lowercase
|> strip_punctuation
|> collapse_spaces
```

Every step is a pure function that "takes a string and returns a string", so you can chain them freely and test each one on its own. **The order, however, is not free.** Removing punctuation turns `"Wait , what ?"` into `"wait  what "`, creating a new run of spaces and a trailing space. If you clean up the spaces before removing punctuation, those spaces stay behind. You have to order the steps so that later steps clean up the traces left by earlier ones.

The key to `collapse_spaces` is that `string.split(" ")` produces empty strings between consecutive spaces (`"a  b"` → `["a", "", "b"]`). If you do not drop the empty pieces with `list.filter`, `string.join` brings the spaces right back.

`collapse_spaces` handles only the space character `" "`, so it cannot remove tabs or newlines. That is why the first step of `normalize` uses `string.trim` to clear away all whitespace characters at both ends. If you skip this step, `"\tGleam\n"` stays as `"\tgleam\n"`.

`strip_punctuation` has the shape "spread out → filter → put back together": turn the text into a list of characters, filter it, and join it again. Chaining `string.replace` four times would also work, but keeping the characters to remove in a list constant gathers the rule in one place. Building a large transformation by composing small functions is covered further in the theory note "Function composition and pipelines".
