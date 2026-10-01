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

// 现有代码：在计算过程中直接打印输出。请用下面的函数把计算和输出分开。
// 收据文本 "합계 = "（意为“合计 = ”）保持韩文，因为测试会精确比对它。
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
