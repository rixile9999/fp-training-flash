import gleeunit/should
import order_line.{
  EmptySku, InvalidOrderId, InvalidQuantity, OrderLine, WrongFieldCount,
  parse_line,
}

pub fn parses_valid_line_test() {
  parse_line("1001,APPLE-01,3")
  |> should.equal(Ok(OrderLine(1001, "APPLE-01", 3)))
}

pub fn trims_fields_test() {
  parse_line(" 1001 , APPLE-01 ,  3 ")
  |> should.equal(Ok(OrderLine(1001, "APPLE-01", 3)))
}

pub fn wrong_field_count_test() {
  parse_line("1001,APPLE-01")
  |> should.equal(Error(WrongFieldCount(2)))
}

pub fn invalid_order_id_test() {
  parse_line("A-1001,APPLE-01,3")
  |> should.equal(Error(InvalidOrderId("A-1001")))
}

pub fn empty_sku_test() {
  parse_line("1001,  ,3")
  |> should.equal(Error(EmptySku))
}

pub fn zero_quantity_test() {
  parse_line("1001,APPLE-01,0")
  |> should.equal(Error(InvalidQuantity("0")))
}

pub fn non_numeric_quantity_test() {
  parse_line("1001,APPLE-01, 3개")
  |> should.equal(Error(InvalidQuantity("3개")))
}

pub fn first_error_wins_test() {
  parse_line("x,,0")
  |> should.equal(Error(InvalidOrderId("x")))
  parse_line("1001,,0")
  |> should.equal(Error(EmptySku))
}
