import accumulate.{accumulate}
import gleam/int
import gleam/string
import gleeunit/should

pub fn empty_list_test() {
  accumulate([], fn(x) { x * x })
  |> should.equal([])
}

pub fn squares_test() {
  accumulate([1, 2, 3], fn(x) { x * x })
  |> should.equal([1, 4, 9])
}

pub fn uppercases_strings_test() {
  accumulate(["hello", "world"], string.uppercase)
  |> should.equal(["HELLO", "WORLD"])
}

pub fn changes_element_type_test() {
  accumulate([10, 200], int.to_string)
  |> should.equal(["10", "200"])
}

pub fn keeps_order_of_long_list_test() {
  accumulate(["the", "quick", "brown", "fox", "etc"], string.reverse)
  |> should.equal(["eht", "kciuq", "nworb", "xof", "cte"])
}

pub fn nested_accumulate_test() {
  accumulate(["a", "b", "c"], fn(x) {
    accumulate(["1", "2", "3"], fn(y) { x <> y })
  })
  |> should.equal([["a1", "a2", "a3"], ["b1", "b2", "b3"], ["c1", "c2", "c3"]])
}
