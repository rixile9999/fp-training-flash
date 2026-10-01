The number of rules is not fixed, so you need a fold that carries "the game so far" as the accumulator and applies the rules one at a time. But each step can fail, so instead of the usual `list.fold` you use `list.try_fold`.

```gleam
rules
|> list.try_fold(game, fn(current, rule) { rule(current) })
|> result.map(change_player)
```

When the function returns `Ok(next)`, `list.try_fold` takes `next` as the next accumulator; when it returns `Error(e)`, it returns `Error(e)` immediately without looking at the remaining rules. So "stop at the first error" and "each rule receives the previous rule's result" are both solved at once. For an empty list, the initial game comes out unchanged as `Ok`. Changing the turn should only happen on success, so you attach it with `result.map`.

There are two common mistakes.

- Skipping a failed rule inside `list.fold` (returning the current game unchanged) and wrapping the result in `Ok` at the end. The error disappears, and a move that broke a rule looks like a successful one.
- Applying every rule separately to **the initial game**, as in `list.try_map(rules, fn(rule) { rule(game) })`. Errors are caught, but the rules' changes do not carry over, so even if stones are captured three times, only one capture remains in the result.

You can think of `try_fold` as the base exercise's `result.try` pipeline unrolled to the length of the list. This relationship is covered further in the theory note "Chaining Results and monads" (chaining-results-monads).
