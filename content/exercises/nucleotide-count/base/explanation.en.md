This exercise does two things at once: it accumulates a count for each letter, and it stops right there when it hits an invalid letter. "Accumulate, and stop on failure" is exactly the shape of `list.try_fold`. If the function returns `Ok(new accumulator)`, it moves on to the next letter; if it returns `Error`, the rest is skipped and that `Error` becomes the whole result.

The key is to make the initial value a dictionary with `A`, `C`, `G` and `T` all set to 0. That way

- nucleotides that never appear stay in the result with 0, and
- `dict.get(counts, letter)` failing in itself means "this is not a valid letter".

You don't need a separate list of valid letters: the initial dictionary expresses the rule in one place.

There are two common mistakes. If you count with `list.fold` and simply skip unknown letters, even `"AGXXACT"` becomes `Ok`. Conversely, if you start from `dict.new()` and count with `dict.upsert`, keys with a count of 0 go missing for inputs that lack some nucleotides, such as `""` or `"G"`.

A fold is the most general way to reduce a list to a single value (theory note "The universality of fold: the common skeleton of list recursion"), and returning failure as a `Result` value means the caller cannot ignore the error (theory note "Errors are values too").
