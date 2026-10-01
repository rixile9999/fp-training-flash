This is the first step of base conversion. Implement `from_digits`, which takes a list of digits in base `base` and returns the value of that number.

```gleam
pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn from_digits(digits: List(Int), base: Int) -> Result(Int, RebaseError)
```

- `digits` are written most significant first. The value of an empty list is 0.
- Implement the conversion yourself (do not use `int.undigits`).
- If `base` is less than 2, return `Error(InvalidBase(base))` without looking at the digits.
- If a digit is less than 0 or greater than or equal to `base`, return `Error(InvalidDigit(that digit))`. If there are several invalid digits, report the first one.

```gleam
from_digits([1, 0, 1], 2)  // -> Ok(5)
from_digits([1, 2, 1], 2)  // -> Error(InvalidDigit(2))
```
