When the library's self-service return machine misreads a barcode and a letter ends up in the ISBN, the whole machine freezes. That is because the ISBN check function `is_valid(isbn: String) -> Bool` crashes on an invalid character because of `let assert`. Fix it so that it never crashes on any input and returns `True` or `False`.

The checking rules stay the same.

- After removing hyphens (`-`), there must be exactly 10 characters.
- The first 9 characters must be digits, and the last must be a digit or an uppercase `X` (value 10). `X` may appear only in the last position.
- `d₁×10 + d₂×9 + … + d₁₀×1` must be divisible by 11.
- Breaking any of these rules gives `False`. Do not replace an invalid character with some other value for the calculation.

```gleam
is_valid("3-598-21507-X")  // -> True
is_valid("3-598-2A508-8")  // -> False   (right now the program crashes)
```
