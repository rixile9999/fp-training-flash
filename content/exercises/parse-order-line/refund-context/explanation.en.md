The structure is the same as parsing one order line. Split the fields, check the count with a `case` pattern, then chain functions that return a `Result` per field with `use` and `result.try`. If an earlier step fails, the later steps do not run, so the order of checks matches the order of the code (the topic **Chaining Results and monads (chaining-results-monads)**).

Two things are new in this exercise.

- **Turning a string into a custom type.** `parse_reason` maps the known strings to constructors and sends the rest to `UnknownReason`. Once you convert at the boundary like this, the rest of the code only has to handle the three cases of `Reason`, and the compiler tells you about any case you miss (the topic **Sum types and exhaustive matching**). Compare using the `string.lowercase` value, but put the original field in the error so it shows exactly what the user typed.
- **A range bounded on both sides.** Write both conditions in a single guard, as in `Ok(amount) if amount >= 1 && amount <= max_amount`. The upper bound is inclusive, so 1,000,000 is allowed.

Common mistakes:

- Comparing the reason case-sensitively and rejecting `"Wrong_Item"`.
- Writing the upper bound with `<` and rejecting a request of exactly 1,000,000 (off by one at the boundary).
- Checking only the lower bound and forgetting the upper bound.
