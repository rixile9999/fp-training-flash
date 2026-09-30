import gleam/list

pub type Cart {
  Cart(total: Int, items: Int, member: Bool)
}

pub type Rule {
  Rule(name: String, applies: fn(Cart) -> Bool, discount: fn(Int) -> Int)
}

pub fn try_rule(cart: Cart, rule: Rule) -> Result(Cart, Nil) {
  case rule.applies(cart) {
    True -> Ok(Cart(..cart, total: rule.discount(cart.total)))
    False -> Error(Nil)
  }
}

// 조건을 항상 처음 장바구니로 판단한다.
pub fn run_rules(cart: Cart, rules: List(Rule)) -> #(Cart, List(String)) {
  let #(final, applied) =
    list.fold(rules, #(cart, []), fn(acc, rule) {
      let #(current, names) = acc
      case rule.applies(cart) {
        True -> #(
          Cart(..current, total: rule.discount(current.total)),
          [rule.name, ..names],
        )
        False -> acc
      }
    })
  #(final, list.reverse(applied))
}
