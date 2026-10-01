Cart discount rules come with a condition. Check the rules in order, apply only the ones whose condition holds, and also return a log of which rules were applied. Do not print the log; return it as a value.

```gleam
pub type Cart {
  Cart(total: Int, items: Int, member: Bool)
}

pub type Rule {
  Rule(name: String, applies: fn(Cart) -> Bool, discount: fn(Int) -> Int)
}
```

1. `try_rule(cart: Cart, rule: Rule) -> Result(Cart, Nil)`
   - If `rule.applies(cart)` is `True`, return in `Ok` the cart with `rule.discount` applied to `total` only; otherwise `Error(Nil)`.
2. `run_rules(cart: Cart, rules: List(Rule)) -> #(Cart, List(String))`
   - Apply the rules in list order with `try_rule`. Check each rule's condition against **the current cart, after the earlier rules were applied**.
   - Collect the `name` of each applied rule in the order they were applied, and return them together with the final cart.

```gleam
let member = Rule("member-10", fn(c) { c.member }, fn(t) { t * 90 / 100 })
let big = Rule("big-order", fn(c) { c.total >= 50_000 }, fn(t) { t - 5000 })

run_rules(Cart(52_000, 1, True), [member, big])
// 52000 -> 46800 (member discount); 46800 < 50000, so big-order is skipped
// -> #(Cart(46_800, 1, True), ["member-10"])
```
