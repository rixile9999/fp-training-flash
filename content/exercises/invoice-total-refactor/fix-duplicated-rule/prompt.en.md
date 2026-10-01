The invoice calculation was split into step functions, but a customer complaint came in: the totals for bulk orders, for orders of exactly 50,000 won, and for empty invoices come out wrong. The step functions are all correct. Fix `invoice_total`.

Rules (already implemented in the step functions):

- `line_amount`: `unit_price * quantity`; if the quantity is 10 or more, that line gets a 10% discount (fractions of a won dropped)
- `subtotal`: sum of `line_amount` over all lines
- `shipping_fee(amount)`: 0 if 0 won, 0 if 50,000 won or more, otherwise 3,000
- `vat(amount)`: `amount / 10`
- `invoice_total`: `subtotal + vat(subtotal) + shipping_fee(subtotal)`

```gleam
invoice_total([Line("B-7", 1000, 12)])
// -> 14880  (10800 + 1080 + 3000)
```
