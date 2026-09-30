import gleeunit/should
import invoice.{Line, invoice_total, line_amount, shipping_fee, subtotal, vat}

pub fn line_amount_bulk_test() {
  line_amount(Line("B-7", 1000, 12))
  |> should.equal(10_800)
}

pub fn line_amount_bulk_boundary_test() {
  line_amount(Line("C-2", 999, 10))
  |> should.equal(8991)
}

pub fn subtotal_test() {
  subtotal([Line("A-1", 1200, 3), Line("B-7", 1000, 12)])
  |> should.equal(14_400)
}

pub fn shipping_fee_under_threshold_test() {
  shipping_fee(14_400)
  |> should.equal(3000)
}

pub fn shipping_fee_free_at_threshold_test() {
  shipping_fee(50_000)
  |> should.equal(0)
}

pub fn shipping_fee_empty_test() {
  shipping_fee(0)
  |> should.equal(0)
}

pub fn vat_test() {
  vat(14_459)
  |> should.equal(1445)
}

pub fn invoice_total_test() {
  invoice_total([Line("A-1", 1200, 3), Line("B-7", 1000, 12)])
  |> should.equal(18_840)
}
