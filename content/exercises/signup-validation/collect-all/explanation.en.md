Chaining with `use` and `result.try` means "do the next step only if the previous one succeeded". That fits when later steps depend on the values of earlier ones, but the four checks in this problem are independent of each other. There is no reason a short username should stop you from checking the email. So the solution **runs all four checks first** and stores the results in variables.

Then it matches the four results together in one `case`.

- Only when all four are `Ok` does it build a `NewUser`. Only the values taken out in this pattern go into the record, so values that did not pass the checks cannot slip in.
- In every other case, `errors_of` turns each result's error into `[]` or `[e]`, and they are joined with `list.flatten` in field order.

The reason for not using `result.all` or `result.partition` is that the success values all have different types (`String`, `Nil`, `Int`), so the four results cannot go into a single `List(Result(a, e))`. The error side is `SignupError` in every case, so it can be combined. This "collect every failure" combination is different from chaining that stops at the first failure, and the topic **Chaining Results and monads (chaining-results-monads)** covers the difference between the two.

Frequent mistakes:

- Chaining with `use` and then wrapping the error in `[e]`. The types line up, but only the first error comes out.
- Prepending errors to the accumulated list (`[e, ..acc]`, `list.append(errors, acc)`), which reverses the order.
- Leaving out the last check. If the result becomes an empty error list like `Error([])`, the caller only knows that it failed, not why.
