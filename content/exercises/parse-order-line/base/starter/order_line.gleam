pub type OrderLine {
  OrderLine(order_id: Int, sku: String, quantity: Int)
}

pub type ParseError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  EmptySku
  InvalidQuantity(String)
}

pub fn parse_line(line: String) -> Result(OrderLine, ParseError) {
  todo
}
