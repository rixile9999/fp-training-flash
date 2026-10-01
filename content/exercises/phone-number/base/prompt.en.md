A text messaging service accepts phone numbers in the North American Numbering Plan (NANP). Implement `clean(input: String) -> Result(String, PhoneError)`, which turns numbers that people typed in all sorts of shapes into 10 digits.

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}
```

Check in the order below, and return the error of the first check that fails.

1. **Character check**: treat spaces, `(`, `)`, `-`, `.` and `+` as separators and remove them. If any remaining character is not a digit (`0`–`9`), return `InvalidCharacter(that character)`. If there are several, it's the one that comes first in the input.
2. **Length check**: fewer than 10 digits gives `TooFewDigits`, and more than 11 gives `TooManyDigits`.
3. **Country code**: if there are 11 digits, the first digit is the country code. If it is `1`, remove it; otherwise, return `InvalidCountryCode`.

On success, return the 10-digit string in `Ok`. Area code rules are not checked in this exercise.

```gleam
clean("+1 (223) 456-7890")  // -> Ok("2234567890")
clean("223-abc-7890")       // -> Error(InvalidCharacter("a"))
clean("22234567890")        // -> Error(InvalidCountryCode)
```
