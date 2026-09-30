pub type Cart {
  Cart(total: Int, items: Int, member: Bool)
}

pub type Rule {
  Rule(name: String, applies: fn(Cart) -> Bool, discount: fn(Int) -> Int)
}

pub fn try_rule(cart: Cart, rule: Rule) -> Result(Cart, Nil) {
  todo
}

pub fn run_rules(cart: Cart, rules: List(Rule)) -> #(Cart, List(String)) {
  todo
}
