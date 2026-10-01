The answer is `#(16, 0, -1)`.

- `a`: `map` on `Some(8)` gives `Some(16)`; in `then`, `16 >= 10`, so `Some(16)`; `unwrap` gives `16`.
- `b`: `map` on `Some(4)` gives `Some(8)`; in `then`, `8 >= 10` is false, so `None`; `unwrap` gives the default `0`.
- `c`: `None` passes straight through `map` and `then` and stays `None`; `unwrap` gives the default `-1`.

The key is the difference between the two functions. The function passed to `option.map` returns a plain value, so the result always keeps the shape "what was there is still there, and what was missing is still missing". The function passed to `option.then` returns an `Option`, so a `Some` can turn into a `None`. Use `then` for steps that can fail along the way, such as "keep it only if it meets the condition".

A common mistake is answering `8` for `b`. Once the `then` step has produced `None`, the original value is gone, and all you see is the default that the final `unwrap` provides. It is also easy to think the function in `map` runs on `None` in `c`, but `None` has no value to apply it to, so the function is never called.

How to chain steps that can fail is covered further, together with `Result`, in the theory note "Chaining Results and monads" (chaining-results-monads).
