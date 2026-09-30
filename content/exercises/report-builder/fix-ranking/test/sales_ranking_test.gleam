import gleam/dict
import gleeunit/should
import sales_ranking.{
  build_ranking, format_row, parse_line, rank, total_by_product,
}

pub fn parse_line_test() {
  parse_line("apple,3")
  |> should.equal(Ok(#("apple", 3)))
}

pub fn total_by_product_test() {
  total_by_product([#("pear", 2), #("apple", 5), #("pear", 4)])
  |> should.equal(dict.from_list([#("apple", 5), #("pear", 6)]))
}

pub fn rank_orders_by_quantity_desc_test() {
  rank([#("apple", 5), #("pear", 6), #("fig", 1)])
  |> should.equal([#("pear", 6), #("apple", 5), #("fig", 1)])
}

pub fn rank_breaks_ties_by_name_test() {
  rank([#("pear", 5), #("kiwi", 9), #("date", 2), #("apple", 5), #("fig", 2)])
  |> should.equal([
    #("kiwi", 9),
    #("apple", 5),
    #("pear", 5),
    #("date", 2),
    #("fig", 2),
  ])
}

pub fn format_row_test() {
  format_row(1, #("apple", 30))
  |> should.equal("1. apple (30)")
}

pub fn build_ranking_numbers_from_one_test() {
  build_ranking(["apple,3"])
  |> should.equal(["1. apple (3)"])
}

pub fn build_ranking_full_test() {
  build_ranking(["pear,2", "apple,5", "pear,4", "fig,oops", "kiwi,5"])
  |> should.equal(["1. pear (6)", "2. apple (5)", "3. kiwi (5)"])
}
