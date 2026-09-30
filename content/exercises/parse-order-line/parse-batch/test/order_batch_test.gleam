import gleeunit/should
import order_batch.{
  InvalidOrderId, InvalidQuantity, LineError, OrderLine, parse_batch,
}

pub fn parses_every_line_test() {
  parse_batch("1001,APPLE-01,3\n1002,PEAR-02,1")
  |> should.equal(
    Ok([OrderLine(1001, "APPLE-01", 3), OrderLine(1002, "PEAR-02", 1)]),
  )
}

pub fn reports_failing_line_number_test() {
  parse_batch("1001,APPLE-01,3\nx,PEAR-02,1")
  |> should.equal(Error(LineError(2, InvalidOrderId("x"))))
}

pub fn skips_blank_lines_test() {
  parse_batch("1001,APPLE-01,3\n   \n1002,PEAR-02,1\n")
  |> should.equal(
    Ok([OrderLine(1001, "APPLE-01", 3), OrderLine(1002, "PEAR-02", 1)]),
  )
}

pub fn empty_text_test() {
  parse_batch("")
  |> should.equal(Ok([]))
}

pub fn blank_lines_count_in_numbering_test() {
  parse_batch("1001,APPLE-01,3\n\n1002,PEAR-02,0")
  |> should.equal(Error(LineError(3, InvalidQuantity("0"))))
}

pub fn first_failing_line_test() {
  parse_batch("a,APPLE-01,3\nb,PEAR-02,1")
  |> should.equal(Error(LineError(1, InvalidOrderId("a"))))
}

pub fn keeps_line_order_test() {
  parse_batch("3,C,1\n1,A,1\n2,B,1")
  |> should.equal(
    Ok([OrderLine(3, "C", 1), OrderLine(1, "A", 1), OrderLine(2, "B", 1)]),
  )
}
