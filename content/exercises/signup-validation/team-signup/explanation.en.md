Each person's check is independent of the others, and the person in charge needs to learn about every invalid form at once to fix the roster. So instead of `list.try_map`, which stops at the first failure, use the approach of **running everything and then splitting**.

1. Run `validate_all` for each person with `list.index_map`, and attach the number (`index + 1`) to the error side only, with `result.map_error`. The result is a `List(Result(NewUser, #(Int, List(SignupError))))`. Now success and failure each have a single type, so they fit in one list.
2. Split the success values and the errors with `result.partition`. It is `Ok` only when the error list is empty.
3. `result.partition` returns both lists in **reverse** order (this is stated in the standard library documentation). So `list.reverse` both of them.

This problem stacks two layers of "collect every error". Within one person, `validate_all` collects the field errors; across the whole roster, `validate_team` collects the errors per person. Keeping the lower-level errors (`List(SignupError)`) instead of throwing them away, and wrapping them in a higher-level error with extra context (the number), is a typical example of the topic **Errors are values too (errors-as-values)**. The difference between chaining that stops (`try`) and combining that collects (`partition`) is covered in the topic **Chaining Results and monads**.

Frequent mistakes:

- Returning the result of `result.partition` as is, which reverses the order of the people and of the errors.
- Using the index of `list.index_map` as is, so numbers start at 0.
- Processing with `list.try_map`, which reports only the first person with an invalid form.
