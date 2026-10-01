All three symptoms have one cause: `invoice_total` did not call the step functions and **rewrote the rules itself**.

- It recomputed the subtotal as the sum of `unit_price * quantity`, so the bulk discount in `line_amount` was lost.
- It rewrote the shipping rule as `amount > 50_000`, so an order of exactly 50,000 won is charged 3,000 won.
- The copy has no "no shipping fee for 0 won" branch, so an empty invoice comes to 3,000 won.

The fix is to delete the copies and call the functions that are already verified.

```gleam
let amount = subtotal(lines)
amount + vat(amount) + shipping_fee(amount)
```

A common mistake is fixing just one symptom. If you only look at the discount problem and change the subtotal to `subtotal(lines)`, the bulk order test passes, but the shipping copy remains, so the 50,000 won boundary and the empty invoice are still wrong. Asking "why is the same rule in two places?" solves all three symptoms at once.

The point of splitting functions is to gather each rule in one place. With pure functions, replacing a call with its body or the other way around gives the same result (referential transparency), so turning a copied expression back into a function call is a safe change. See the theory note "Referential transparency".
