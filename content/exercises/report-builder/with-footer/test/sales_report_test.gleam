import gleeunit/should
import sales_report.{Sale, build_report, footer, parse_all}

pub fn parse_all_splits_valid_and_invalid_test() {
  parse_all(["books,100", "oops", "food,50"])
  |> should.equal(#([Sale("books", 100), Sale("food", 50)], 1))
}

pub fn parse_all_keeps_input_order_test() {
  parse_all(["toys,1", "books,2", "food,3"])
  |> should.equal(#([Sale("toys", 1), Sale("books", 2), Sale("food", 3)], 0))
}

pub fn parse_all_ignores_blank_lines_test() {
  parse_all(["books,100", "", "x", ""])
  |> should.equal(#([Sale("books", 100)], 1))
}

pub fn footer_test() {
  footer([Sale("books", 100), Sale("food", 50)], 2)
  |> should.equal(["total: 150", "skipped: 2"])
}

pub fn footer_empty_test() {
  footer([], 0)
  |> should.equal(["total: 0", "skipped: 0"])
}

pub fn build_report_test() {
  build_report(["food,3000", "", "books,12000", "oops"])
  |> should.equal(["books: 12000", "food: 3000", "total: 15000", "skipped: 1"])
}

pub fn build_report_only_invalid_test() {
  build_report(["bad", "worse,1,2"])
  |> should.equal(["total: 0", "skipped: 2"])
}
