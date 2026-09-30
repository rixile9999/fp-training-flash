import gleam/int
import gleam/list

pub type Tier {
  Basic
  Silver
  Gold
}

pub type Line {
  Line(name: String, price: Int, quantity: Int)
}

pub type Summary {
  Summary(subtotal: Int, discount: Int, shipping: Int, vat: Int, total: Int)
}

pub fn subtotal(lines: List(Line)) -> Int {
  lines
  |> list.map(fn(line) { line.price * line.quantity })
  |> int.sum
}

pub fn member_discount(tier: Tier, amount: Int) -> Int {
  let rate = case tier {
    Basic -> 0
    Silver -> 3
    Gold -> 5
  }
  amount * rate / 100
}

pub fn shipping_fee(amount: Int) -> Int {
  case amount {
    0 -> 0
    _ if amount >= 30_000 -> 0
    _ -> 2500
  }
}

pub fn summarize(lines: List(Line), tier: Tier) -> Summary {
  let sub = subtotal(lines)
  let discount = member_discount(tier, sub)
  let discounted = sub - discount
  let shipping = shipping_fee(sub)
  let vat = discounted / 10
  Summary(
    subtotal: sub,
    discount: discount,
    shipping: shipping,
    vat: vat,
    total: discounted + shipping + vat,
  )
}
