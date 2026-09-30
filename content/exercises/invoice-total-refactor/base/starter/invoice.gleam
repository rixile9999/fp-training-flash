import gleam/int
import gleam/list

pub type Line {
  Line(sku: String, unit_price: Int, quantity: Int)
}

// 동작은 맞지만 모든 규칙이 한 함수에 섞여 있습니다.
// 아래의 단계 함수들을 채운 뒤, 이 함수가 그 함수들을 호출하도록 바꾸세요.
pub fn invoice_total(lines: List(Line)) -> Int {
  let subtotal =
    list.fold(lines, 0, fn(acc, line) {
      let amount = line.unit_price * line.quantity
      let amount = case line.quantity >= 10 {
        True -> amount * 90 / 100
        False -> amount
      }
      acc + amount
    })
  let shipping = case subtotal {
    0 -> 0
    s if s >= 50_000 -> 0
    _ -> 3000
  }
  subtotal + subtotal / 10 + shipping
}

pub fn line_amount(line: Line) -> Int {
  todo
}

pub fn subtotal(lines: List(Line)) -> Int {
  todo
}

pub fn shipping_fee(amount: Int) -> Int {
  todo
}

pub fn vat(amount: Int) -> Int {
  todo
}
