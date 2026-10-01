You're building software for a device that encrypts data by transforming it several times. You need to make simple operation functions and be able to chain them together into complex operations. Every function returns a **function**, not a number.

- `secret_add(secret)`: a function that adds `secret` to the input `x` (`x + secret`)
- `secret_subtract(secret)`: a function that subtracts `secret` from the input `x` (`x - secret`)
- `secret_multiply(secret)`: a function that multiplies the input `x` by `secret` (`x * secret`)
- `secret_divide(secret)`: a function that integer-divides the input `x` by `secret` (`x / secret`, dropping the fractional part)
- `secret_combine(f, g)`: a function that applies `f` to the input `x` first, then applies `g` to that result

```gleam
let multiply = secret_multiply(7)
let divide = secret_divide(3)
let combined = secret_combine(multiply, divide)
combined(6)
// -> 14  (6 * 7 = 42, 42 / 3 = 14)
```
