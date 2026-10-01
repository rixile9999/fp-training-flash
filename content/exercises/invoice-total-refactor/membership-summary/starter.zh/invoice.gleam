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

// 现有代码：只计算总额，所有规则都混在一个函数里。
pub fn checkout_total(lines: List(Line), tier: Tier) -> Int {
  let sub = list.fold(lines, 0, fn(acc, l) { acc + l.price * l.quantity })
  let rate = case tier {
    Basic -> 0
    Silver -> 3
    Gold -> 5
  }
  let discounted = sub - sub * rate / 100
  let shipping = case discounted {
    0 -> 0
    d if d >= 30_000 -> 0
    _ -> 2500
  }
  discounted + shipping + discounted / 10
}

pub fn subtotal(lines: List(Line)) -> Int {
  todo
}

pub fn member_discount(tier: Tier, amount: Int) -> Int {
  todo
}

pub fn shipping_fee(amount: Int) -> Int {
  todo
}

pub fn summarize(lines: List(Line), tier: Tier) -> Summary {
  todo
}
