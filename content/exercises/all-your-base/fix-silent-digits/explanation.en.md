The original code filters out invalid digits with `list.filter` and then calculates. The type promises a `Result`, but in practice it returns `Ok` even for invalid input, so the caller ends up trusting a wrong value as the right answer. That bug is harder to find than a crash.

The fixed code merges "checking" and "accumulating" into a single `list.try_fold`. For each digit it checks the range: if the digit is valid it continues with `Ok(total * base + digit)`, and if not it stops immediately with `Error(InvalidDigit(digit))`. The conversion to the output base is attached with `result.map` only on success, so a failure is carried through to the end unchanged. As the theory note "Errors are values too" (errors-as-values) puts it, the caller can only deal with a failure if the failure is part of the return value.

Common mistakes:

- Replacing invalid digits with 0 or filtering them out. "Repairing" the input and carrying on is just another way of hiding the failure.
- Carrying the accumulator around as a `Result` with `list.fold` and overwriting the error again and again. The last error gets reported, and the calculation continues after the first error.
- Checking only `digit < base` and missing negative digits.
