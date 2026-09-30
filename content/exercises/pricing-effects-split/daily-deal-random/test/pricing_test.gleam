import gleeunit/should
import pricing.{type Product, Product, apply_deal, deal_price}

fn shelf() -> List(Product) {
  [Product("귤", 10_000), Product("사과", 12_345), Product("배", 5000)]
}

pub fn deal_price_test() {
  deal_price(10_000)
  |> should.equal(7000)
}

pub fn deal_price_rounds_to_hundreds_test() {
  deal_price(12_345)
  |> should.equal(8600)
}

pub fn apply_deal_test() {
  apply_deal(shelf(), 2)
  |> should.equal([
    Product("귤", 10_000),
    Product("사과", 12_345),
    Product("배", 3500),
  ])
}

pub fn apply_deal_first_index_test() {
  apply_deal(shelf(), 0)
  |> should.equal([
    Product("귤", 7000),
    Product("사과", 12_345),
    Product("배", 5000),
  ])
}

pub fn apply_deal_out_of_range_test() {
  apply_deal(shelf(), 3)
  |> should.equal(shelf())
}

pub fn apply_deal_negative_index_test() {
  apply_deal(shelf(), -1)
  |> should.equal(shelf())
}
