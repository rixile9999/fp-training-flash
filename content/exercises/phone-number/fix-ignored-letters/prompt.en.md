On a sign-up form for text notifications, a bug was found: numbers with typos mixed in, like `223-45a6-7890`, get signed up as they are. That's because the number cleanup function `clean` silently removes every character that isn't a digit. Fix the code.

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}
```

The correct behavior is the checks below, in this order. Return the error of the first check that fails.

1. **Character check**: treat only spaces, `(`, `)`, `-`, `.` and `+` as separators and remove them. If any remaining character is not a digit, return `InvalidCharacter(that character)`. If there are several, it's the one that comes first in the input.
2. **Length check**: fewer than 10 digits gives `TooFewDigits`, and more than 11 gives `TooManyDigits`.
3. **Country code**: with 11 digits, remove the first digit if it is `1`; otherwise, return `InvalidCountryCode`.

The length and country code handling (`normalize_length`) is already correct.

```gleam
clean("223-45a6-7890")  // -> Error(InvalidCharacter("a"))   (currently Ok("2234567890"))
clean("223.456.7890")   // -> Ok("2234567890")
```
