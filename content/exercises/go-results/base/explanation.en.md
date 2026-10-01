The heart of this exercise is the requirement "on failure, skip the remaining steps and go back to the state before the failure". If you chain `Result`s into a pipeline, this requirement becomes the very shape of the code.

```gleam
let outcome =
  game
  |> rule1
  |> result.map(rule2)
  |> result.try(rule3)
  |> result.try(rule4)
```

- `result.try(r, f)` calls `f(g)` only when `r` is `Ok(g)`. It leaves an `Error` untouched and lets it flow to the end, so the rules after the first error never run and the first error message is what remains.
- `rule2` does not return a `Result`, so you plug it in with `result.map`. Putting it in `result.try` would not type-check.

Once the pipeline is done, split the result with `case` just once. On `Ok(updated)`, change only the turn in the game as changed by the rules; on `Error(message)`, record the error on **the `game` you originally received**. Values are immutable, so the original `game` never changed while going through the rules, and you do not need to implement any "undo" for the failure case.

There are two common mistakes.

- Unwrapping one step at a time with nested `case`s and recording the error on the game from the point of failure (for example, the game after `rule2` captured stones). The rule is "on failure, discard the changes", so it is wrong if the captured-stone count is kept.
- Applying `change_player` on both success and failure. A move that breaks a rule was never played, so the turn must not pass.

The idea of treating errors as values and chaining only the success path is covered further in the theory notes "Errors are values too" (errors-as-values) and "Chaining Results and monads" (chaining-results-monads).
