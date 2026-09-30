import gleam/list

pub fn percent_off(percent: Int) -> fn(Int) -> Int {
  fn(price) { price * { 100 - percent } / 100 }
}

pub fn amount_off(amount: Int) -> fn(Int) -> Int {
  fn(price) { price - amount }
}

pub fn apply_rules(price: Int, rules: List(fn(Int) -> Int)) -> Int {
  list.fold(rules, price, fn(current, rule) { rule(current) })
}
