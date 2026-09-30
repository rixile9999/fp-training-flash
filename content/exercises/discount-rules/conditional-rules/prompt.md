장바구니 할인 규칙에는 적용 조건이 붙습니다. 규칙을 순서대로 검사해 조건을 만족하는 것만 적용하고, 어떤 규칙이 적용됐는지 기록을 함께 돌려주세요. 기록은 화면에 출력하지 않고 값으로 돌려줍니다.

```gleam
pub type Cart {
  Cart(total: Int, items: Int, member: Bool)
}

pub type Rule {
  Rule(name: String, applies: fn(Cart) -> Bool, discount: fn(Int) -> Int)
}
```

1. `try_rule(cart: Cart, rule: Rule) -> Result(Cart, Nil)`
   - `rule.applies(cart)`가 `True`이면 `total`에만 `rule.discount`를 적용한 장바구니를 `Ok`로, 아니면 `Error(Nil)`.
2. `run_rules(cart: Cart, rules: List(Rule)) -> #(Cart, List(String))`
   - 규칙을 목록 순서대로 `try_rule`로 적용한다. 각 규칙의 조건은 **앞 규칙들이 적용된 현재 장바구니**로 판단한다.
   - 적용된 규칙의 `name`을 적용 순서대로 모아 최종 장바구니와 함께 돌려준다.

```gleam
let member = Rule("member-10", fn(c) { c.member }, fn(t) { t * 90 / 100 })
let big = Rule("big-order", fn(c) { c.total >= 50_000 }, fn(t) { t - 5000 })

run_rules(Cart(52_000, 1, True), [member, big])
// 52000 -> 46800 (회원 할인), 46800 < 50000 이므로 big-order는 건너뜀
// -> #(Cart(46_800, 1, True), ["member-10"])
```
