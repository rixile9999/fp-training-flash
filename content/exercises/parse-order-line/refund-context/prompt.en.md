Implement `parse_refund`, which turns one refund request line received by customer service, `"order_id:amount:reason"`, into a `RefundRequest`.

```gleam
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

pub fn parse_refund(line: String) -> Result(RefundRequest, RefundError)
```

- Split the line on colons (`:`) and trim the surrounding whitespace of each field. If there are not exactly 3 fields, `WrongFieldCount(actual count)`.
- If the order ID is not an integer, `InvalidOrderId(field)`.
- The amount must be an integer from 1 up to and including `max_amount` (1,000,000). Otherwise, `InvalidAmount(field)`.
- The reason is one of `damaged`, `late` or `wrong_item`, case-insensitive. They become `Damaged`, `Late` and `WrongItem` respectively. Any other reason is `UnknownReason(field)`, where the field is stored with only the surrounding whitespace trimmed and its case unchanged.
- Check in this order: field count, order ID, amount, reason. Return only the first error found.

```gleam
parse_refund("1001:15000:damaged")  // -> Ok(RefundRequest(1001, 15000, Damaged))
parse_refund("1001:15000:Refused")  // -> Error(UnknownReason("Refused"))
```
