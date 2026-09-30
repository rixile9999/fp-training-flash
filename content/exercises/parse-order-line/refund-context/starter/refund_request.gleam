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
  todo
}
