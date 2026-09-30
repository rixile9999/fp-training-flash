import gleam/int
import gleam/string
import gleeunit/should
import sorter.{partition}

pub fn empty_list_test() {
  partition([], int.is_even)
  |> should.equal(#([], []))
}

pub fn splits_even_and_odd_test() {
  partition([1, 2, 3, 4, 5], int.is_even)
  |> should.equal(#([2, 4], [1, 3, 5]))
}

pub fn all_match_test() {
  partition([2, 4], int.is_even)
  |> should.equal(#([2, 4], []))
}

pub fn none_match_test() {
  partition(["b", "c"], fn(s) { s == "a" })
  |> should.equal(#([], ["b", "c"]))
}

pub fn both_sides_keep_order_test() {
  partition(["ant", "Bee", "cat", "Dog", "eel", "Fox"], fn(s) {
    string.lowercase(s) == s
  })
  |> should.equal(#(["ant", "cat", "eel"], ["Bee", "Dog", "Fox"]))
}

pub fn duplicates_are_kept_test() {
  partition([3, 3, 8, 3], fn(x) { x > 5 })
  |> should.equal(#([8], [3, 3, 3]))
}
