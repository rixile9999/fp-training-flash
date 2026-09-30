import cart_discount.{type Cart, Cart, Rule, run_rules, try_rule}
import gleeunit/should

fn member_10() {
  Rule("member-10", fn(c: Cart) { c.member }, fn(t) { t * 90 / 100 })
}

fn big_order() {
  Rule("big-order", fn(c: Cart) { c.total >= 50_000 }, fn(t) { t - 5000 })
}

fn bulk() {
  Rule("bulk", fn(c: Cart) { c.items >= 10 }, fn(t) { t - 1000 })
}

pub fn try_rule_applies_test() {
  try_rule(Cart(10_000, 1, True), member_10())
  |> should.equal(Ok(Cart(9000, 1, True)))
}

pub fn try_rule_skips_test() {
  try_rule(Cart(10_000, 1, False), member_10())
  |> should.equal(Error(Nil))
}

pub fn run_rules_test() {
  run_rules(Cart(60_000, 2, True), [member_10(), big_order()])
  |> should.equal(#(Cart(49_000, 2, True), ["member-10", "big-order"]))
}

pub fn run_rules_checks_current_total_test() {
  run_rules(Cart(52_000, 1, True), [member_10(), big_order()])
  |> should.equal(#(Cart(46_800, 1, True), ["member-10"]))
}

pub fn run_rules_names_in_order_test() {
  run_rules(Cart(60_000, 12, False), [bulk(), member_10(), big_order()])
  |> should.equal(#(Cart(54_000, 12, False), ["bulk", "big-order"]))
}

pub fn run_rules_none_apply_test() {
  run_rules(Cart(1000, 1, False), [member_10(), big_order(), bulk()])
  |> should.equal(#(Cart(1000, 1, False), []))
}
