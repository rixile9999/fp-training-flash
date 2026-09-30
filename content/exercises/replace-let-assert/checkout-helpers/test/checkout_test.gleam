import checkout.{BadLine, BadQuantity, UnknownSku, cart_total, line_total}
import gleam/dict
import gleeunit/should

fn prices() {
  dict.from_list([#("APPLE", 1200), #("PEAR", 2500), #("MILK", 3100)])
}

pub fn line_total_multiplies_price_test() {
  line_total(prices(), "APPLE x 3")
  |> should.equal(Ok(3600))
}

pub fn unknown_sku_is_error_test() {
  line_total(prices(), "KIWI x 2")
  |> should.equal(Error(UnknownSku("KIWI")))
}

pub fn cart_total_sums_lines_test() {
  cart_total(prices(), ["APPLE x 3", "PEAR x 1", "MILK x 2"])
  |> should.equal(Ok(12_300))
}

pub fn line_without_separator_is_bad_line_test() {
  line_total(prices(), "APPLE*3")
  |> should.equal(Error(BadLine("APPLE*3")))
}

pub fn non_numeric_quantity_test() {
  line_total(prices(), "APPLE x three")
  |> should.equal(Error(BadQuantity("three")))
}

pub fn zero_quantity_test() {
  line_total(prices(), "APPLE x 0")
  |> should.equal(Error(BadQuantity("0")))
}

pub fn cart_total_reports_first_bad_line_test() {
  cart_total(prices(), ["APPLE x 1", "KIWI x 2", "PEAR x zero"])
  |> should.equal(Error(UnknownSku("KIWI")))
}

pub fn empty_cart_is_zero_test() {
  cart_total(prices(), [])
  |> should.equal(Ok(0))
}
