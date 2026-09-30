import gleam/int
import gleam/list
import gleeunit/should
import list_ops

pub fn foldl_empty_returns_initial_test() {
  list_ops.foldl(over: [], from: 2, with: fn(acc, x) { acc * x })
  |> should.equal(2)
}

pub fn foldl_goes_left_to_right_test() {
  list_ops.foldl(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
  |> should.equal("abc")
}

pub fn length_counts_items_test() {
  list_ops.length([1, 2, 3, 4])
  |> should.equal(4)
}

pub fn length_of_empty_list_test() {
  list_ops.length([])
  |> should.equal(0)
}

pub fn reverse_test() {
  list_ops.reverse([1, 3, 5, 7])
  |> should.equal([7, 5, 3, 1])
}

pub fn reverse_empty_test() {
  list_ops.reverse([])
  |> should.equal([])
}

pub fn reverse_large_list_test() {
  let result = list_ops.reverse(numbers(200_000))
  list.take(result, 3)
  |> should.equal([200_000, 199_999, 199_998])
  list.length(result)
  |> should.equal(200_000)
}

/// [1, 2, ..., n]
fn numbers(n: Int) -> List(Int) {
  int.range(from: n, to: 0, with: [], run: fn(acc, i) { [i, ..acc] })
}
