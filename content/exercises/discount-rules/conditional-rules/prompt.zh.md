购物车折扣规则带有适用条件。请按顺序检查规则，只应用满足条件的规则，同时返回一份记录，说明哪些规则被应用了。记录不要打印到屏幕上，而是作为值返回。

```gleam
pub type Cart {
  Cart(total: Int, items: Int, member: Bool)
}

pub type Rule {
  Rule(name: String, applies: fn(Cart) -> Bool, discount: fn(Int) -> Int)
}
```

1. `try_rule(cart: Cart, rule: Rule) -> Result(Cart, Nil)`
   - 如果 `rule.applies(cart)` 为 `True`，就用 `Ok` 返回只对 `total` 应用了 `rule.discount` 的购物车，否则返回 `Error(Nil)`。
2. `run_rules(cart: Cart, rules: List(Rule)) -> #(Cart, List(String))`
   - 按列表顺序用 `try_rule` 应用规则。每条规则的条件都根据**已应用前面规则的当前购物车**来判断。
   - 按应用顺序收集已应用规则的 `name`，与最终的购物车一起返回。

```gleam
let member = Rule("member-10", fn(c) { c.member }, fn(t) { t * 90 / 100 })
let big = Rule("big-order", fn(c) { c.total >= 50_000 }, fn(t) { t - 5000 })

run_rules(Cart(52_000, 1, True), [member, big])
// 52000 -> 46800（会员折扣），46800 < 50000，所以跳过 big-order
// -> #(Cart(46_800, 1, True), ["member-10"])
```
