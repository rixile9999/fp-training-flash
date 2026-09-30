import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/string

pub type CheckoutError {
  BadLine(String)
  BadQuantity(String)
  UnknownSku(String)
}

/// 주문 줄 "SKU x 수량"의 금액(단가 * 수량)을 구한다.
pub fn line_total(
  prices: Dict(String, Int),
  line: String,
) -> Result(Int, CheckoutError) {
  let #(sku, quantity) = parse_line(line)
  Ok(price_of(prices, sku) * quantity)
}

/// 장바구니의 모든 줄 금액을 더한다.
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
