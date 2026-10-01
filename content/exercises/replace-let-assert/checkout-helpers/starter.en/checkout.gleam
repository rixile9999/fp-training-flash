import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/string

pub type CheckoutError {
  BadLine(String)
  BadQuantity(String)
  UnknownSku(String)
}

/// Computes the amount (unit price * quantity) of an order line "SKU x quantity".
pub fn line_total(
  prices: Dict(String, Int),
  line: String,
) -> Result(Int, CheckoutError) {
  let #(sku, quantity) = parse_line(line)
  Ok(price_of(prices, sku) * quantity)
}

/// Adds up the amounts of all lines in the cart.
pub fn cart_total(
  prices: Dict(String, Int),
  lines: List(String),
) -> Result(Int, CheckoutError) {
  Ok(
    list.fold(lines, 0, fn(sum, line) {
      let assert Ok(amount) = line_total(prices, line)
      sum + amount
    }),
  )
}

fn parse_line(line: String) -> #(String, Int) {
  let assert [sku, quantity_text] = string.split(line, " x ")
  let assert Ok(quantity) = int.parse(quantity_text)
  let assert True = quantity >= 1
  #(sku, quantity)
}

fn price_of(prices: Dict(String, Int), sku: String) -> Int {
  let assert Ok(price) = dict.get(prices, sku)
  price
}
