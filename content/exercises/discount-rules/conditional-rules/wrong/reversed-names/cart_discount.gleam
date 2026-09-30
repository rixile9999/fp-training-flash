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

pub fn run_rules(cart: Cart, rules: List(Rule)) -> #(Cart, List(String)) {
  let #(final, applied) =
    list.fold(rules, #(cart, []), fn(acc, rule) {
      let #(current, names) = acc
      case try_rule(current, rule) {
        Ok(next) -> #(next, [rule.name, ..names])
        Error(Nil) -> acc
      }
    })
  #(final, applied)
}
