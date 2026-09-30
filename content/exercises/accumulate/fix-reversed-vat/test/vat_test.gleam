import gleam/string
import gleeunit/should
import vat.{accumulate, with_vat}

pub fn with_vat_keeps_order_test() {
  with_vat([1000, 2500, 300])
  |> should.equal([1100, 2750, 330])
}

pub fn with_vat_rounds_down_test() {
  with_vat([999])
  |> should.equal([1098])
}

pub fn accumulate_keeps_order_test() {
  accumulate(["a", "b", "c"], string.uppercase)
  |> should.equal(["A", "B", "C"])
}

pub fn accumulate_empty_list_test() {
  accumulate([], fn(x) { x + 1 })
  |> should.equal([])
}

pub fn with_vat_empty_list_test() {
  with_vat([])
  |> should.equal([])
}

pub fn accumulate_long_list_keeps_order_test() {
  accumulate([1, 2, 3, 4, 5, 6], fn(x) { x * 2 })
  |> should.equal([2, 4, 6, 8, 10, 12])
}
