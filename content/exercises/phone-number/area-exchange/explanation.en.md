Both check functions have the shape `fn(String) -> Result(String, PhoneError)`. On success they return the number they received unchanged, and on failure they return an error carrying the reason. Because they share a shape, you can chain them one after another with `result.try`.

```gleam
pub fn clean(input: String) -> Result(String, PhoneError) {
  normalize(input)
  |> result.try(check_area_code)
  |> result.try(check_exchange_code)
}
```

The order of the pipe is the order of the specification. If an earlier step produces an `Error`, the later steps don't run and that error comes out unchanged. Adding one more check later is just a matter of adding one more line.

Each check function assumes it receives "a cleaned-up 10-digit number". Thanks to that assumption, the function doesn't have to worry about separators or the country code, and can look at just the digit it wants with `string.slice(number, 0, 1)` or `string.slice(number, 3, 1)`. Keeping that assumption true is `clean`'s responsibility: the input must go through `normalize` first.

There are four common mistakes.

- Blocking only the digits shown in the examples. The rule is "the first digit is `2`–`9`", so both codes must block `0` and `1` alike. If you think in terms of the allowed range, you won't miss any.
- Getting the position of the exchange code wrong. The exchange code is the fourth digit, which is position 3 when counting from 0.
- Applying the checks to the raw input first and cleaning up afterwards. The leading `1` in `"1 (223) 456-7890"` is the country code, but it gets mistaken for the area code. A short input like `"023"` also gives an area code error instead of a length error.
- Swapping the order of the two checks. For a number where both are wrong, a different error gets reported.

Chaining failable steps of the same shape is covered further in the theory note "Chaining Results and monads" (chaining-results-monads).
