Implement `parse_line`, which turns one line of an order file, `"order_id,sku,quantity"`, into an `OrderLine`. When it fails, it reports what went wrong as a `ParseError`.

```gleam
pub type OrderLine {
  OrderLine(order_id: Int, sku: String, quantity: Int)
}

pub type ParseError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  EmptySku
  InvalidQuantity(String)
}

pub fn parse_line(line: String) -> Result(OrderLine, ParseError)
```

- Split the line on commas (`,`), trim the surrounding whitespace of each field, then interpret it.
- If there are not exactly 3 fields, `WrongFieldCount(actual number of fields)`.
- If the order ID is not an integer, `InvalidOrderId(field)`.
- If the SKU (product code) is an empty string, `EmptySku`.
- If the quantity is not an integer or is less than 1, `InvalidQuantity(field)`.
- The field stored in an error is the trimmed value.
- Check in this order: field count, order ID, SKU, quantity. Return only the first error found.

```gleam
parse_line(" 1001 , APPLE-01 , 3")  // -> Ok(OrderLine(1001, "APPLE-01", 3))
parse_line("1001,APPLE-01,0")       // -> Error(InvalidQuantity("0"))
```
