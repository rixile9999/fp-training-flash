The original `invoice_total` mixes four rules: the line amount with the bulk discount, the subtotal, the shipping fee and VAT. Once each rule has its own function, `invoice_total` becomes a one-line description: "compute the subtotal, then add VAT and shipping to it".

```gleam
let amount = subtotal(lines)
amount + vat(amount) + shipping_fee(amount)
```

You can be sure this split does not change the result because every piece is a **pure function**. Replacing the expression `subtotal / 10` with the call `vat(subtotal)` gives the same value (referential transparency). This property is what makes the refactoring of pulling expressions out into functions safe.

A common mistake is keeping a rule in **two places**. If you rewrite `subtotal` with `list.fold` and just add up `unit_price * quantity`, the bulk discount in `line_amount` is lost. If you split out a function but other functions don't call it, the rule gets copied, and sooner or later the copies drift apart. `subtotal` should reuse the line rule through `list.map(line_amount)` and be responsible only for the sum.

The boundary values have to move along with the rules. "10 or more" is `>= 10`, and "free from 50,000 won" is `>= 50_000`. The rule that an empty invoice (subtotal 0) gets no shipping fee was hidden in the `0 -> 0` branch of the original code, so it is easy to lose while moving things around. Now that you can test `shipping_fee(0)` directly, such an omission shows up right away. See the theory notes "Referential transparency" and "Function composition and pipelines".
