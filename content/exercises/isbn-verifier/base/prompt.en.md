Implement `is_valid(isbn: String) -> Bool`, which checks whether an ISBN-10 entered into a library management system is valid. Whatever string comes in, it must not crash and must return `True` or `False`.

The rules are as follows.

1. Remove hyphens (`-`) first, wherever they are and however many there are.
2. After removing them, there must be exactly 10 characters.
3. The first 9 characters must be digits (`0`–`9`). The last character is a digit or an uppercase `X`, and `X` means 10. `X` may appear only in the last position.
4. If the character values are d₁ … d₁₀, the following must hold.

```text
(d₁ × 10 + d₂ × 9 + d₃ × 8 + … + d₉ × 2 + d₁₀ × 1) mod 11 == 0
```

For example, `3-598-21508-8` gives `3×10 + 5×9 + 9×8 + 8×7 + 2×6 + 1×5 + 5×4 + 0×3 + 8×2 + 8×1 = 264`, and 264 is divisible by 11, so it is valid.

```gleam
is_valid("3-598-21508-8")  // -> True
is_valid("3-598-21507-X")  // -> True
is_valid("3-598-21508-9")  // -> False
```
