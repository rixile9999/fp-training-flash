The error type `PhoneError` has one constructor per failure reason. The caller can split the causes with `case` and show different guidance, such as "Letters can't be entered" or "The number is too short". If you squash errors into a `String` or `Nil`, this distinction is lost. You can also put the information you need (the offending character) into the constructor, as `InvalidCharacter` does.

When there are several checks, "which error is reported first" is part of the specification too. If you split the steps into functions and chain them with `use`, the order of lines in the code is the order of the checks.

```gleam
pub fn clean(input: String) -> Result(String, PhoneError) {
  use digits <- result.try(extract_digits(input))  // 1. character check
  normalize_length(digits)                         // 2. length, 3. country code
}
```

- `extract_digits` removes the separators and then uses `list.try_map` to check that each character is a digit. `try_map` stops at the first failure, so "the first invalid character" is reported automatically.
- `normalize_length` splits on the number of digits and the shape of the list together with `case`. The single pattern `11, ["1", ..rest]` checks "11 digits starting with 1" and removes the country code at the same time.

There are three common mistakes.

- Keeping only the digits and throwing everything else away (`list.filter(is_digit)`). An invalid input like `"523-abc-7890"` passes if the digit count happens to be right, or is reported with the wrong length error.
- Checking the length first. `"555-12x"` should give a character error first, but you get `TooFewDigits`.
- Not rejecting more than 11 digits separately and handling it as "11 or more digits means check the country code". A 12-digit number turns into `InvalidCountryCode` or a wrong success.

Why failure reasons are expressed as an algebraic data type is covered further in the theory notes "Sum types and exhaustive matching" (algebraic-data-types) and "Errors are values too" (errors-as-values).
