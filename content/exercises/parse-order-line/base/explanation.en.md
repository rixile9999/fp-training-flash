Interpreting one line is a sequence of "split fields → order ID → SKU → quantity", and each step can fail. The solution carries this structure straight into code.

1. Build the fields with `string.split` and `list.map(string.trim)`, then check the count with the `[a, b, c]` pattern in a `case`. All the wrong-count cases are gathered into a single catch-all pattern that returns `WrongFieldCount(list.length(fields))`.
2. Keep a small function per field that returns `Result(value, ParseError)` (`parse_order_id`, `parse_sku`, `parse_quantity`). `int.parse` gives only `Error(Nil)`, with no reason for the failure, so `result.replace_error` turns it into this exercise's error.
3. Chain the three results with `use x <- result.try(...)`. If an earlier step is an `Error`, the later steps do not run, so "return only the first error" holds automatically.

Without `use`, you get three levels of nested `case`. `result.try` is the chaining rule "on success, pass the value to the next computation; on failure, pass the failure along unchanged", and this is what the topic **Chaining Results and monads (chaining-results-monads)** is about. Defining the errors as a custom type, `ParseError`, lets the caller handle each cause with a `case` (the topics **Errors are values too** and **Sum types and exhaustive matching**).

Common mistakes:

- Forgetting to trim, so `int.parse` rejects `" 3"`.
- Checking only that `int.parse` succeeded and forgetting the range check `quantity >= 1`. A guard in the `case` (`Ok(q) if q >= 1`) expresses both conditions at once.
- Accepting an empty SKU as is. Fields that are read as strings still have to be checked if they have rules.
