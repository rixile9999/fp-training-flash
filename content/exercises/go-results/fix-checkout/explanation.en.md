The bug is in a single line: `result.unwrap(check_stock(order), order)`. `unwrap` turns an `Error` into the default value, so even when the stock check fails, the code carries the original order on to the next step. The information "out of stock" disappears on this line.

The fixed code uses `use` and `result.try` so that it moves on to the next line only on success.

```gleam
use checked <- result.try(check_stock(order))
let discounted = apply_points(checked)
use charged <- result.try(charge(discounted))
Ok(Order(..charged, status: Paid))
```

`use checked <- result.try(r)` means "if `r` is `Ok(checked)`, keep running the lines below; if it is an `Error`, return that `Error` right away as this function's result". So the code reads as just the success path written from top to bottom, and `result.try` takes care of failures. Applying points cannot fail, so it is written with a plain `let`.

There are three common mistakes when fixing this.

- Using `use _ <- result.try(check_stock(order))` to check only whether it succeeded, and passing the original `order` to the next step. If the stock check step changes the order before returning it (for example, adding a packaging fee), that change is lost. The value inside `Ok` is the input to the next step.
- Keeping the stock result aside and checking it together with the payment result at the end. If the payment is checked first, then when both the stock check and the payment fail, "card declined" is returned. In effect, the code tried to take payment even though there was no stock.
- Paying first and applying points afterwards. When the order of the steps changes, the amount charged changes.

This has the same structure as the Go rules in the base exercise: chain the steps that can fail in order, and stop at the first failure. This shape is covered further in the theory note "Errors are values too" (errors-as-values).
