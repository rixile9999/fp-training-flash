Here is a base conversion function, `rebase`. It checks the bases correctly, but it silently drops out-of-range digits with `list.filter` and keeps calculating. As a result, even binary input containing a `2` ends with `Ok`.

Fix it so that invalid digits are not dropped but reported as `Error(InvalidDigit(that digit))`.

- A digit is invalid if it is less than 0 or greater than or equal to `input_base`.
- If there are several invalid digits, report the first one.
- Keep everything else as it is (the conversion result, the base checks and their order, and `[0]` when the value is 0).

```gleam
rebase(digits: [1, 2, 1], input_base: 2, output_base: 10)
// now: Ok([3])   after the fix: Error(InvalidDigit(2))
```
