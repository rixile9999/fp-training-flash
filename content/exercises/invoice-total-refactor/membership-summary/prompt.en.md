An online store's checkout screen will now show an itemized statement instead of a single total. `checkout_total` in the starter code is the existing function that only computes the total. Use it as a reference for the rules, then delete it or change it to return `summarize(lines, tier).total`. Implement the functions below. The tests call each function directly.

| Function | Rule |
|---|---|
| `subtotal(lines: List(Line)) -> Int` | Sum of `price * quantity` over all lines |
| `member_discount(tier: Tier, amount: Int) -> Int` | `Basic` 0%, `Silver` 3%, `Gold` 5%. `amount * rate / 100` (fractions of a won dropped) |
| `shipping_fee(amount: Int) -> Int` | 0 if 0 won, 0 if 30,000 won or more, otherwise 2,500 |
| `summarize(lines: List(Line), tier: Tier) -> Summary` | Compute in the order below and gather the results into a `Summary` |

Order of calculation in `summarize`:

1. `subtotal` = the subtotal
2. `discount` = `member_discount(tier, subtotal)`
3. discounted amount = subtotal − discount
4. `shipping` = `shipping_fee(discounted amount)`
5. `vat` = discounted amount / 10 (shipping is not subject to VAT)
6. `total` = discounted amount + shipping + VAT

```gleam
summarize([Line("Mug", 12_000, 2), Line("Coffee beans", 9_000, 1)], Gold)
// -> Summary(subtotal: 33_000, discount: 1650, shipping: 0, vat: 3135, total: 34_485)
```
