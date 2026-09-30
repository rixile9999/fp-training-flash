import gleam/int
import gleam/list
import gleam/result
import gleam/string

pub type Reason {
  Damaged
  Late
  WrongItem
}

pub type RefundRequest {
  RefundRequest(order_id: Int, amount: Int, reason: Reason)
}

pub type RefundError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  InvalidAmount(String)
  UnknownReason(String)
}

pub const max_amount = 1_000_000

pub fn parse_refund(line: String) -> Result(RefundRequest, RefundError) {
  case line |> string.split(":") |> list.map(string.trim) {
    [id_field, amount_field, reason_field] -> {
      use order_id <- result.try(parse_order_id(id_field))
      use amount <- result.try(parse_amount(amount_field))
      use reason <- result.try(parse_reason(reason_field))
      Ok(RefundRequest(order_id:, amount:, reason:))
    }
    fields -> Error(WrongFieldCount(list.length(fields)))
  }
}

fn parse_order_id(field: String) -> Result(Int, RefundError) {
  int.parse(field) |> result.replace_error(InvalidOrderId(field))
}

fn parse_amount(field: String) -> Result(Int, RefundError) {
  case int.parse(field) {
    Ok(amount) if amount >= 1 && amount < max_amount -> Ok(amount)
    _ -> Error(InvalidAmount(field))
  }
}

fn parse_reason(field: String) -> Result(Reason, RefundError) {
  case string.lowercase(field) {
    "damaged" -> Ok(Damaged)
    "late" -> Ok(Late)
    "wrong_item" -> Ok(WrongItem)
    _ -> Error(UnknownReason(field))
  }
}
