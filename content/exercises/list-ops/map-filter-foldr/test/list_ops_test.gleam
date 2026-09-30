import gleam/int
import gleam/list
import gleeunit/should
import list_ops

pub fn foldr_empty_returns_initial_test() {
  list_ops.foldr(over: [], from: 2, with: fn(acc, x) { acc * x })
  |> should.equal(2)
}

pub fn foldr_goes_right_to_left_test() {
  list_ops.foldr(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
  |> should.equal("cba")
}

pub fn map_test() {
  list_ops.map([1, 3, 5, 7], fn(x) { x + 1 })
  |> should.equal([2, 4, 6, 8])
}

pub fn map_changes_type_test() {
  list_ops.map([3, 1, 2], int.to_string)
  |> should.equal(["3", "1", "2"])
}

pub fn filter_test() {
  list_ops.filter([1, 2, 3, 5], fn(x) { x % 2 == 1 })
  |> should.equal([1, 3, 5])
}

pub fn filter_keeps_order_test() {
  list_ops.filter([9, 4, 7, 10, 2, 8], fn(x) { x > 5 })
  |> should.equal([9, 7, 10, 8])
}

pub fn map_large_list_test() {
  let result = list_ops.map(numbers(200_000), fn(x) { x * 2 })
  list.take(result, 3)
  |> should.equal([2, 4, 6])
  list.length(result)
  |> should.equal(200_000)
}

/// [1, 2, ..., n]
fn numbers(n: Int) -> List(Int) {
  int.range(from: n, to: 0, with: [], run: fn(acc, i) { [i, ..acc] })
}
