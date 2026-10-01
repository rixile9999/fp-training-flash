Reading `[4, 2]` from the left gives `0 → 0 * 10 + 4 = 4 → 4 * 10 + 2 = 42`. You multiply the accumulated value by the base and add the new digit, so it takes the shape of a `fold`.

Add "each digit can fail" to that, and `list.try_fold` is the right fit. When the accumulating function returns `Ok(new accumulator)`, it keeps going; when it returns `Error`, it stops right there. So the first invalid digit becomes the result, and nothing after it is calculated. Letting errors flow through as return values like this is the short-circuit that the theory note "Errors are values too" (errors-as-values) talks about.

A common mistake is to carry the accumulator itself around as a `Result` with `list.fold(digits, Ok(0), ...)` and overwrite it with a new `Error` every time an invalid digit shows up. That never stops and runs to the end, so the last invalid digit gets reported. And if you only check `digit < base`, negative digits silently slip into the calculation.

There is also a reason to check the base first. If the base is 1 or less, "the range of a digit" has no meaning at all, so reporting the more fundamental error first is more helpful to the caller.
