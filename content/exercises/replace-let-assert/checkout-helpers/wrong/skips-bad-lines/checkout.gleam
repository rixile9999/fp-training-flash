import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result
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
  use #(sku, quantity) <- result.try(parse_line(line))
  use price <- result.try(price_of(prices, sku))
  Ok(price * quantity)
}

/// 장바구니의 모든 줄 금액을 더한다.
pub fn cart_total(
  prices: Dict(String, Int),
  lines: List(String),
) -> Result(Int, CheckoutError) {
  lines
  |> list.map(line_total(prices, _))
  |> result.values
  |> int.sum
  |> Ok
}

fn parse_line(line: String) -> Result(#(String, Int), CheckoutError) {
  case string.split(line, " x ") {
    [sku, quantity_text] -> {
      use quantity <- result.try(parse_quantity(quantity_text))
      Ok(#(sku, quantity))
    }
    _ -> Error(BadLine(line))
  }
}

fn parse_quantity(text: String) -> Result(Int, CheckoutError) {
  case int.parse(text) {
    Ok(quantity) if quantity >= 1 -> Ok(quantity)
    _ -> Error(BadQuantity(text))
  }
}

fn price_of(
  prices: Dict(String, Int),
  sku: String,
) -> Result(Int, CheckoutError) {
  dict.get(prices, sku) |> result.replace_error(UnknownSku(sku))
}
