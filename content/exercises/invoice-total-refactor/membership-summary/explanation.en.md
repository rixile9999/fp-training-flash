The items on the statement are computed from one another. The discount comes from the subtotal, shipping and VAT come from the discounted amount, and the total comes from those three. If `summarize` makes these dependencies visible with `let` names and gets each value by calling a step function, the rules and their order are clear at a glance.

```gleam
let sub = subtotal(lines)
let discount = member_discount(tier, sub)
let discounted = sub - discount
let shipping = shipping_fee(discounted)
let vat = discounted / 10
```

`checkout_total`, which returned only the total, kept the intermediate values locked inside the function, so you could not tell "how much the discount was". Splitting the same calculation into steps makes each line of the statement the result of a step, and each step can be tested on its own.

A common mistake is mixing up **which amount is passed to the next step**.

- If you decide shipping from the subtotal before discount, as in `shipping_fee(sub)`, a 30,000 won order still ships free even after the discount brings it down to 28,500 won.
- If you charge VAT on the amount that already includes shipping, the VAT is inflated.

Watch the boundary value too. "Free from 30,000 won" is `>= 30_000`, so at exactly 30,000 won there is no shipping fee.

In both mistakes the rules themselves are right; it is the **order of the connections** that is wrong. Splitting into small step functions makes each piece easy to verify, but whether the combining function passes the right values has to be checked separately with tests at the level of the combination. See the theory note "Function composition and pipelines".
