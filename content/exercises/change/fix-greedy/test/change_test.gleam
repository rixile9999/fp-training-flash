import change.{ImpossibleTarget}
import gleeunit/should

pub fn canonical_coins_test() {
  change.min_coins([1, 5, 10, 25], 40)
  |> should.equal(Ok(3))
}

pub fn greedy_is_not_optimal_test() {
  change.min_coins([1, 4, 15, 20, 50], 23)
  |> should.equal(Ok(3))
}

pub fn greedy_dead_end_test() {
  change.min_coins([4, 5], 27)
  |> should.equal(Ok(6))
}

pub fn impossible_target_test() {
  change.min_coins([3, 7], 11)
  |> should.equal(Error(ImpossibleTarget))
}

pub fn zero_target_test() {
  change.min_coins([1, 3, 4], 0)
  |> should.equal(Ok(0))
}

pub fn large_target_test() {
  change.min_coins([1, 2, 5, 10, 20, 50, 100], 9999)
  |> should.equal(Ok(105))
}
