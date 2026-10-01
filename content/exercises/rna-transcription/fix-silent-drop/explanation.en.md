`list.filter_map(complement)` **throws away** the characters for which `complement` returned an `Error` and collects the rest. After that the result is always wrapped in `Ok`, so whatever the input, the result is `Ok`. The fact that there was an invalid character disappears, and the caller trusts the shortened sequence as a correct result.

The fixed code uses `list.try_map`, which means "succeeds only if everything succeeds", and joins the pieces with `result.map` only on success.

```gleam
dna
|> string.to_graphemes
|> list.try_map(complement)
|> result.map(string.concat)
```

There are also some wrong fixes that are easy to make along the way.

- Turning the result into an `Error` if it is an empty string: this catches only the case where every character is invalid and still misses the case where only some are. On top of that, the valid empty input `""` becomes an error as well. Instead of guessing failure from the result, pass the failure on right where it happens.
- Keeping invalid characters as they are with `result.unwrap(complement(c), c)`: the length is right, but `"ACXT"` looks like `Ok("UGXA")`, and the error hides inside the result.

Use functions that absorb failures, such as `filter_map` and `unwrap`, only when the requirement says "failed elements may be ignored". The design of passing failures on through the result type is covered further in the theory note "Errors are values too" (errors-as-values).
