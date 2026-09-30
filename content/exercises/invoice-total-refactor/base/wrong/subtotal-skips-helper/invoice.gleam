import gleam/int
import gleam/list

pub type Line {
  Line(sku: String, unit_price: Int, quantity: Int)
}

pub fn line_amount(line: Line) -> Int {
  let amount = line.unit_price * line.quantity
  case line.quantity >= 10 {
    True -> amount * 90 / 100
    False -> amount
  }
}

pub fn subtotal(lines: List(Line)) -> Int {
  list.fold(lines, 0, fn(acc, line) { acc + line.unit_price * line.quantity })
}

pub fn shipping_fee(amount: Int) -> Int {
  case amount {
    0 -> 0
    _ if amount >= 50_000 -> 0
    _ -> 3000
  }
}

pub fn vat(amount: Int) -> Int {
  amount / 10
}

pub fn invoice_total(lines: List(Line)) -> Int {
  let amount = subtotal(lines)
  amount + vat(amount) + shipping_fee(amount)
}
