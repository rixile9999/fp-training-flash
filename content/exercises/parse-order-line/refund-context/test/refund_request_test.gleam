import gleeunit/should
import refund_request.{
  Damaged, InvalidAmount, Late, RefundRequest, UnknownReason, WrongFieldCount,
  WrongItem, parse_refund,
}

pub fn parses_valid_request_test() {
  parse_refund("1001:15000:damaged")
  |> should.equal(Ok(RefundRequest(1001, 15_000, Damaged)))
}

pub fn unknown_reason_test() {
  parse_refund("1001:15000:Refused")
  |> should.equal(Error(UnknownReason("Refused")))
}

pub fn non_numeric_amount_test() {
  parse_refund("1001:만원:late")
  |> should.equal(Error(InvalidAmount("만원")))
}

pub fn reason_ignores_case_test() {
  parse_refund("7:500:Wrong_Item")
  |> should.equal(Ok(RefundRequest(7, 500, WrongItem)))
}

pub fn zero_amount_test() {
  parse_refund("7:0:late")
  |> should.equal(Error(InvalidAmount("0")))
}

pub fn amount_at_limit_test() {
  parse_refund("7:1000000:late")
  |> should.equal(Ok(RefundRequest(7, 1_000_000, Late)))
}

pub fn amount_over_limit_test() {
  parse_refund("7:1000001:late")
  |> should.equal(Error(InvalidAmount("1000001")))
}

pub fn wrong_field_count_test() {
  parse_refund("7:500:late:urgent")
  |> should.equal(Error(WrongFieldCount(4)))
}
