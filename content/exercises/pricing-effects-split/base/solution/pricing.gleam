import gleam/int
import gleam/io
import gleam/list
import gleam/string

pub type Item {
  Item(name: String, price: Int, quantity: Int)
}

pub type Quote {
  Quote(total: Int, log: List(String))
}

pub fn line_log(item: Item) -> String {
  item.name
  <> " x"
  <> int.to_string(item.quantity)
  <> " = "
  <> int.to_string(item.price * item.quantity)
}

pub fn quote(items: List(Item)) -> Quote {
  let total =
    items
    |> list.map(fn(item) { item.price * item.quantity })
    |> int.sum
  let lines = list.map(items, line_log)
  Quote(
    total: total,
    log: list.append(lines, ["합계 = " <> int.to_string(total)]),
  )
}

pub fn render(quote: Quote) -> String {
  string.join(quote.log, "\n")
}

/// 효과는 여기 한 곳에만 있습니다. 계산은 모두 순수 함수가 합니다.
pub fn checkout(items: List(Item)) -> Int {
  let q = quote(items)
  io.println(render(q))
  q.total
}
