On the book registration screen, a wrong ISBN only shows "Invalid", so librarians cannot tell what to fix. Implement `validate`, which tells them why the ISBN is wrong.

```gleam
pub type IsbnError {
  WrongLength(length: Int)
  InvalidCharacter(position: Int, found: String)
  ChecksumMismatch
}

pub fn validate(isbn: String) -> Result(List(Int), IsbnError)
```

Remove all hyphens (`-`), then check in the order below and return the error of the first check that fails.

1. **Length**: if there are not 10 characters, `WrongLength(number of characters)`.
2. **Characters**: the first 9 characters must be digits, and the last must be a digit or an uppercase `X` (value 10). Otherwise `InvalidCharacter(position, found)`. `position` is counted from 0 **after removing the hyphens**, and if there are several, it is the first such character.
3. **Weighted sum**: if `d₁×10 + d₂×9 + … + d₁₀×1` is not divisible by 11, `ChecksumMismatch`.

If every check passes, return the list of the 10 character values in `Ok`.

```gleam
validate("3-598-21507-X")  // -> Ok([3, 5, 9, 8, 2, 1, 5, 0, 7, 10])
validate("3-598-P1581-X")  // -> Error(InvalidCharacter(position: 4, found: "P"))
validate("3-598-21507")    // -> Error(WrongLength(9))
```
