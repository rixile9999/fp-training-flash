The design point of this exercise is keeping the rule that filters out empty words in **one place**, `name_parts`. `string.split(" ")` produces an empty string even when there is nothing between two separators (`"a  b"` → `["a", "", "b"]`), so you need to filter with `list.filter(fn(part) { part != "" })`. A common trap is that `string.trim` alone can't fix repeated spaces in the middle. If an empty word is left over, `initial("")` becomes `"."`, giving results like `"P. . P."`.

Once you have this cleaned-up list of words, `initials` and `monogram` become short pipelines of the same shape: "transform each word (`list.map`) and combine them (`string.join`, `string.concat`)". Both functions use the same `name_parts`, so if the whitespace rule changes, you only have to fix one place.

Another common mistake is pattern matching like `[first, last, ..]` that assumes a name has two words. The middle name disappears, and a one-word name isn't handled at all. To apply the same transformation to every element regardless of the list's length, `list.map` is the right tool. Getting `""` when there are no words also comes for free from how `string.join([], " ")` behaves, so you don't need a separate branch.

Building new features by chaining small functions is covered further in the theory note "Function composition and pipelines".
