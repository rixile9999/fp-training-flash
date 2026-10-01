The cleanup step from the base exercise is now in the starter under the name `normalize(input: String) -> Result(String, PhoneError)`. This time, add two NANP rules as **separate check functions** and chain the steps together in `clean`.

In a 10-digit number `NXX NXX-XXXX`, the first three digits are the area code and the next three are the exchange code. For both codes, the first digit must be `2`–`9`.

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
  InvalidAreaCode(first: String)
  InvalidExchangeCode(first: String)
}
```

Implement the following three functions. Both check functions may assume they receive a 10-digit string that has passed `normalize`.

- `check_area_code(number: String) -> Result(String, PhoneError)`: if the first digit (position 0) is `"0"` or `"1"`, return `InvalidAreaCode(that digit)`; otherwise, return `Ok(number)`.
- `check_exchange_code(number: String) -> Result(String, PhoneError)`: if the fourth digit (position 3) is `"0"` or `"1"`, return `InvalidExchangeCode(that digit)`; otherwise, return `Ok(number)`.
- `clean(input: String) -> Result(String, PhoneError)`: apply `normalize` → `check_area_code` → `check_exchange_code` in that order, and return the error of the first step that fails.

```gleam
check_exchange_code("2231567890")  // -> Error(InvalidExchangeCode("1"))
clean("1 (223) 456-7890")          // -> Ok("2234567890")
clean("(023) 156-7890")            // -> Error(InvalidAreaCode("0"))
```
