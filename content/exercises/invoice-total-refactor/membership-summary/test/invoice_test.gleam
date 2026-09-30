import gleeunit/should
import invoice.{
  Basic, Gold, Line, Silver, Summary, member_discount, shipping_fee, subtotal,
  summarize,
}

pub fn subtotal_test() {
  subtotal([Line("머그컵", 12_000, 2), Line("원두", 9000, 1)])
  |> should.equal(33_000)
}

pub fn member_discount_test() {
  member_discount(Silver, 9999)
  |> should.equal(299)
}

pub fn shipping_fee_test() {
  shipping_fee(20_000)
  |> should.equal(2500)
}

pub fn shipping_fee_free_at_threshold_test() {
  shipping_fee(30_000)
  |> should.equal(0)
}

pub fn summarize_test() {
  summarize([Line("머그컵", 12_000, 2), Line("원두", 9000, 1)], Gold)
  |> should.equal(Summary(
    subtotal: 33_000,
    discount: 1650,
    shipping: 0,
    vat: 3135,
    total: 34_485,
  ))
}

pub fn summarize_shipping_after_discount_test() {
  summarize([Line("텀블러", 15_000, 2)], Gold)
  |> should.equal(Summary(
    subtotal: 30_000,
    discount: 1500,
    shipping: 2500,
    vat: 2850,
    total: 33_850,
  ))
}

pub fn summarize_vat_excludes_shipping_test() {
  summarize([Line("펜", 1000, 3)], Basic)
  |> should.equal(Summary(
    subtotal: 3000,
    discount: 0,
    shipping: 2500,
    vat: 300,
    total: 5800,
  ))
}

pub fn summarize_empty_test() {
  summarize([], Silver)
  |> should.equal(Summary(
    subtotal: 0,
    discount: 0,
    shipping: 0,
    vat: 0,
    total: 0,
  ))
}
