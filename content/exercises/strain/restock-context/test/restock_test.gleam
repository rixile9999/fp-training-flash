import gleam/int
import gleeunit/should
import restock.{Product, both, discontinued, needs_restock, negate}

pub fn both_requires_both_conditions_test() {
  let even_and_big = both(int.is_even, fn(x) { x > 2 })
  [even_and_big(4), even_and_big(2), even_and_big(5)]
  |> should.equal([True, False, False])
}

pub fn negate_flips_condition_test() {
  let odd = negate(int.is_even)
  [odd(3), odd(4)]
  |> should.equal([True, False])
}

pub fn needs_restock_finds_low_stock_test() {
  needs_restock(
    [Product("우유", 2, True), Product("빵", 30, True), Product("잼", 0, True)],
    5,
  )
  |> should.equal([Product("우유", 2, True), Product("잼", 0, True)])
}

pub fn discontinued_finds_inactive_test() {
  discontinued([Product("우유", 2, True), Product("두유", 9, False)])
  |> should.equal([Product("두유", 9, False)])
}

pub fn threshold_is_exclusive_test() {
  needs_restock([Product("우유", 5, True), Product("빵", 4, True)], 5)
  |> should.equal([Product("빵", 4, True)])
}

pub fn needs_restock_skips_inactive_test() {
  needs_restock([Product("두유", 0, False), Product("우유", 1, True)], 5)
  |> should.equal([Product("우유", 1, True)])
}

pub fn both_is_false_when_only_second_holds_test() {
  both(fn(x) { x > 100 }, int.is_even)(4)
  |> should.be_false
}
