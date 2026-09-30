import gleam/int
import gleam/list

pub fn percent_off(percent: Int) -> fn(Int) -> Int {
  fn(price) { price * { 100 - percent } / 100 }
}

pub fn amount_off(amount: Int) -> fn(Int) -> Int {
  fn(price) { int.max(price - amount, 0) }
}

pub fn apply_rules(price: Int, rules: List(fn(Int) -> Int)) -> Int {
  list.fold_right(rules, price, fn(current, rule) { rule(current) })
}
