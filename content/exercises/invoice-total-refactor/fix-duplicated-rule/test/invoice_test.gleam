import gleeunit/should
import invoice.{Line, invoice_total, line_amount, shipping_fee}

pub fn line_amount_bulk_test() {
  line_amount(Line("B-7", 1000, 12))
  |> should.equal(10_800)
}

pub fn shipping_fee_threshold_test() {
  shipping_fee(50_000)
  |> should.equal(0)
}

pub fn invoice_total_small_test() {
  invoice_total([Line("A-1", 1200, 3)])
  |> should.equal(6960)
}

pub fn invoice_total_bulk_test() {
  invoice_total([Line("B-7", 1000, 12)])
  |> should.equal(14_880)
}

pub fn invoice_total_threshold_test() {
  invoice_total([Line("D-4", 25_000, 2)])
  |> should.equal(55_000)
}

pub fn invoice_total_empty_test() {
  invoice_total([])
  |> should.equal(0)
}
