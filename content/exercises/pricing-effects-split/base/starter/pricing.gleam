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

// 기존 코드: 계산 도중에 바로 출력합니다. 아래 함수들로 계산과 출력을 나누세요.
pub fn checkout(items: List(Item)) -> Int {
  let total =
    list.fold(items, 0, fn(acc, item) {
      let amount = item.price * item.quantity
      io.println(
        item.name
        <> " x"
        <> int.to_string(item.quantity)
        <> " = "
        <> int.to_string(amount),
      )
      acc + amount
    })
  io.println("합계 = " <> int.to_string(total))
  total
}

pub fn line_log(item: Item) -> String {
  todo
}

pub fn quote(items: List(Item)) -> Quote {
  todo
}

pub fn render(quote: Quote) -> String {
  todo
}
