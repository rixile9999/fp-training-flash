import discount.{amount_off, apply_rules, percent_off}
import gleeunit/should

pub fn percent_off_test() {
  percent_off(10)(10_000)
  |> should.equal(9000)
}

pub fn percent_off_rounds_down_test() {
  percent_off(15)(999)
  |> should.equal(849)
}

pub fn amount_off_test() {
  amount_off(1000)(5000)
  |> should.equal(4000)
}

pub fn amount_off_never_negative_test() {
  amount_off(3000)(2000)
  |> should.equal(0)
}

pub fn apply_rules_in_order_test() {
  apply_rules(10_000, [percent_off(10), amount_off(1000)])
  |> should.equal(8000)
}

pub fn apply_rules_order_matters_test() {
  apply_rules(10_000, [amount_off(1000), percent_off(10)])
  |> should.equal(8100)
}

pub fn apply_rules_empty_test() {
  apply_rules(5000, [])
  |> should.equal(5000)
}
