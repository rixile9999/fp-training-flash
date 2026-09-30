import gleam/int
import gleeunit/should
import indexed.{accumulate_indexed}

pub fn empty_list_test() {
  accumulate_indexed([], fn(x, i) { x + i })
  |> should.equal([])
}

pub fn index_starts_at_zero_test() {
  accumulate_indexed(["a", "b", "c"], fn(x, i) { #(i, x) })
  |> should.equal([#(0, "a"), #(1, "b"), #(2, "c")])
}

pub fn numbers_lines_test() {
  accumulate_indexed(["우유", "빵"], fn(item, i) {
    int.to_string(i + 1) <> ". " <> item
  })
  |> should.equal(["1. 우유", "2. 빵"])
}

pub fn single_element_gets_zero_test() {
  accumulate_indexed([7], fn(x, i) { x * 10 + i })
  |> should.equal([70])
}

pub fn combines_value_and_index_test() {
  accumulate_indexed([5, 5, 5, 5], fn(x, i) { x * i })
  |> should.equal([0, 5, 10, 15])
}

pub fn keeps_order_of_long_list_test() {
  accumulate_indexed(["q", "w", "e", "r", "t", "y"], fn(x, _) { x <> "!" })
  |> should.equal(["q!", "w!", "e!", "r!", "t!", "y!"])
}
