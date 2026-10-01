`dict.get` and `int.parse` both return `Result(_, Nil)`. All you learn is that something failed, not why, so if you simply chain them you can't tell "the key is missing" from "the value is wrong". That's why the solution attaches this exercise's error **at each step** with `result.replace_error`: `MissingKey(key)` after `dict.get`, and `NotAnInt(key, value)` after `int.parse`. The two errors call for different actions from the operator (add the key, or fix the value).

`use value <- result.try(...)` means "on success, take the value out and move on to the next line; on failure, end the whole function with that error". `get_port` works the same way: it takes the result of `get_int` and only checks the range. You don't have to write the error handling again, and `get_int`'s error is passed through unchanged. This way of chaining is the subject of the theory note "Chaining Results and monads" (chaining-results-monads), and the design that exposes failure as a return value is covered in the theory note "Errors are values too" (errors-as-values).

Common mistakes:

- Replacing the error only once at the end, as in `dict.get(...) |> result.try(int.parse) |> result.replace_error(MissingKey(key))`. It looks shorter, but an invalid value also becomes `MissingKey`.
- Taking the value out in `get_port` with `result.unwrap(get_int(...), 0)`. The original error disappears and a misleading "port 0 is out of range" error is reported instead.
- Writing the upper bound with `<`, which rejects 65535.
