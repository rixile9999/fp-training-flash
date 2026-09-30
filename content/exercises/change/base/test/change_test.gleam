import change.{ImpossibleTarget}
import gleeunit/should

pub fn single_coin_test() {
  change.find_fewest_coins([1, 5, 10, 25, 100], 25)
  |> should.equal(Ok([25]))
}

pub fn multiple_coins_ascending_test() {
  change.find_fewest_coins([1, 5, 10, 25, 100], 15)
  |> should.equal(Ok([5, 10]))
}

pub fn not_greedy_test() {
  change.find_fewest_coins([1, 4, 15, 20, 50], 23)
  |> should.equal(Ok([4, 4, 15]))
}

pub fn impossible_target_test() {
  change.find_fewest_coins([5, 10], 94)
  |> should.equal(Error(ImpossibleTarget))
}

pub fn unsorted_coins_test() {
  change.find_fewest_coins([25, 10, 5, 1], 40)
  |> should.equal(Ok([5, 10, 25]))
}

pub fn greedy_dead_end_test() {
  change.find_fewest_coins([4, 5], 27)
  |> should.equal(Ok([4, 4, 4, 5, 5, 5]))
}

pub fn zero_target_test() {
  change.find_fewest_coins([1, 5, 10, 21, 25], 0)
  |> should.equal(Ok([]))
}

pub fn negative_target_test() {
  change.find_fewest_coins([1, 2, 5], -5)
  |> should.equal(Error(ImpossibleTarget))
}

pub fn large_target_test() {
  change.find_fewest_coins([1, 2, 5, 10, 20, 50, 100], 999)
  |> should.equal(
    Ok([2, 2, 5, 20, 20, 50, 100, 100, 100, 100, 100, 100, 100, 100, 100]),
  )
}
