All four checks return a `Result`, and if any of them fails, the result is that error. `result.try` expresses this chaining, "continue on success, stop right there on failure", and `use` lets you write it from top to bottom without nesting.

```gleam
use username <- result.try(check_username(form.username))
```

This one line means: "if `check_username` is `Ok(username)`, carry `username` on to the next line; if it is `Error(e)`, the whole of `validate` is `Error(e)`". Stack four of these lines and the order of the checks is the order of the code, and after the first error the remaining checks do not run (topic **Chaining Results and monads (chaining-results-monads)**).

It also matters that the check functions return `Result(value, SignupError)` rather than `Bool`. The success values are used directly as the ingredients of `NewUser`, so the structure guarantees that "only values that passed the checks go into the user record". The reasons for failure are distinguished by the constructors of `SignupError`, so the UI can pick a fitting message (topics **Errors are values too** and **Sum types and exhaustive matching**).

A frequent mistake is to leave out a check or change the order. When only the first error is shown, the order decides which message the user sees, so you must keep the required order. If all errors have to be shown at once, a different way of combining is needed (covered in another exercise of the same family).
