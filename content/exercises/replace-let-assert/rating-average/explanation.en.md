The original code has two places where it crashes: the `panic` for an empty list and the `let assert True` in the range check. Both assume "this case never happens", but products with no reviews and wrongly stored data really do exist. Its return type is `Result`, yet it cannot return a value for some inputs, which makes it a **partial function** (the **Total and partial functions (total-vs-partial-functions)** topic).

The key to the fix is **how to get the information to put in the error**. `list.all` only tells you `True`/`False`, so you cannot tell which rating is the problem. The solution uses `list.find` to look for the first out-of-range rating, and if it gets `Ok(bad)`, puts it straight into `OutOfRange(bad)`. The test condition is pulled out into a named function, `is_out_of_range`, so that the bounds (1 and 5 included) are visible at a glance.

Matching both values together with `case ratings, list.find(...)` lays the three cases (empty, an invalid rating, normal) side by side in one place. Now every input produces either `Ok` or `Error`, so the product page can decide for itself what to do, such as showing "No reviews yet" for `NoRatings` (the **Errors as values** topic).

Common mistakes:

- Checking only the upper bound, so ratings of 0 or below are accepted.
- Writing the bounds wrongly with `<=` and `>=`, so ratings of 1 and 5 are rejected.
- Walking the whole list with `fold` and overwriting the found value, so the last invalid rating gets reported.
