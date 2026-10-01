Implement `rebase`, which takes a list of digits written in one base and converts the same number into a list of digits in another base. Report invalid input with an `Error`.

```gleam
pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn rebase(
  digits digits: List(Int),
  input_base input_base: Int,
  output_base output_base: Int,
) -> Result(List(Int), RebaseError)
```

- `digits` are digits in base `input_base`, most significant first. Return the result most significant first too, with no leading zeros.
- If the value of the number is 0 (an empty list, `[0, 0, 0]` and so on), the result is `Ok([0])`.
- If a base is less than 2, return `Error(InvalidBase(that base))`.
- If a digit is less than 0 or greater than or equal to `input_base`, return `Error(InvalidDigit(that digit))`. If there are several invalid digits, report the first one.
- Check in this order: input base, output base, digits. Return only the first error found.
- Implement the conversion yourself (do not use `int.digits` or `int.undigits`).

```gleam
rebase(digits: [1, 0, 1, 0, 1, 0], input_base: 2, output_base: 10)
// -> Ok([4, 2])        (binary 101010 = 42)
rebase(digits: [1, 2], input_base: 2, output_base: 10)
// -> Error(InvalidDigit(2))
```
