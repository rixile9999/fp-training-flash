import gleam/int
import gleam/list
import gleam/result
import gleam/string

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
  case line |> string.split(",") |> list.map(string.trim) {
    [id_field, sku_field, quantity_field] -> {
      use order_id <- result.try(parse_order_id(id_field))
      use sku <- result.try(parse_sku(sku_field))
      use quantity <- result.try(parse_quantity(quantity_field))
      Ok(OrderLine(order_id:, sku:, quantity:))
    }
    fields -> Error(WrongFieldCount(list.length(fields)))
  }
}

fn parse_order_id(field: String) -> Result(Int, ParseError) {
  int.parse(field) |> result.replace_error(InvalidOrderId(field))
}

fn parse_sku(field: String) -> Result(String, ParseError) {
  case field {
    "" -> Error(EmptySku)
    _ -> Ok(field)
  }
}

fn parse_quantity(field: String) -> Result(Int, ParseError) {
  case int.parse(field) {
    Ok(quantity) if quantity >= 1 -> Ok(quantity)
    _ -> Error(InvalidQuantity(field))
  }
}
