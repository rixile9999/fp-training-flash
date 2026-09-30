import change
import gleeunit/should

pub fn small_amount_test() {
  change.count_ways([1, 2, 5], 5)
  |> should.equal(4)
}

pub fn order_does_not_matter_test() {
  change.count_ways([1, 2], 4)
  |> should.equal(3)
}

pub fn zero_target_test() {
  change.count_ways([2, 3], 0)
  |> should.equal(1)
}

pub fn impossible_target_test() {
  change.count_ways([5, 10], 3)
  |> should.equal(0)
}

pub fn negative_target_test() {
  change.count_ways([1, 2, 5], -3)
  |> should.equal(0)
}

pub fn large_target_test() {
  change.count_ways([1, 2, 5, 10, 20, 50, 100, 200], 2000)
  |> should.equal(23_812_353_521)
}
