import gleam/list
import gleam/string
import gleeunit/should
import sales_report.{
  Sale, build_report, format_row, parse_line, total_by_category,
}

pub fn parse_line_valid_test() {
  parse_line("books,12000")
  |> should.equal(Ok(Sale("books", 12_000)))
}

pub fn parse_line_rejects_non_number_test() {
  parse_line("books,12k")
  |> should.equal(Error(Nil))
}

pub fn parse_line_rejects_wrong_field_count_test() {
  parse_line("books,100,extra")
  |> should.equal(Error(Nil))
}

pub fn total_by_category_sums_same_category_test() {
  total_by_category([Sale("books", 100), Sale("food", 50), Sale("books", 200)])
  |> should.equal([#("books", 300), #("food", 50)])
}

pub fn total_by_category_sorted_by_name_test() {
  total_by_category([Sale("toys", 1), Sale("food", 2), Sale("books", 3)])
  |> should.equal([#("books", 3), #("food", 2), #("toys", 1)])
}

pub fn total_by_category_many_categories_sorted_test() {
  // 카테고리가 32개를 넘으면 dict.to_list의 순서가 이름순이 아니다.
  let categories = [
    "toys", "books", "food", "garden", "music", "shoes", "bags", "cameras",
    "desks", "eggs", "fish", "games", "hats", "ink", "jackets", "keyboards",
    "lamps", "maps", "nails", "oils", "pens", "quilts", "rugs", "soap", "tea",
    "umbrellas", "vases", "watches", "yarn", "zippers", "apples", "cables",
    "drums", "erasers", "flags", "gloves",
  ]
  total_by_category(list.map(categories, fn(c) { Sale(c, 1) }))
  |> should.equal(
    categories
    |> list.sort(string.compare)
    |> list.map(fn(c) { #(c, 1) }),
  )
}

pub fn format_row_test() {
  format_row(#("books", 12_000))
  |> should.equal("books: 12000")
}

pub fn build_report_test() {
  build_report(["food,3000", "books,12000", "books,500"])
  |> should.equal(["books: 12500", "food: 3000"])
}

pub fn build_report_skips_invalid_lines_test() {
  build_report(["books,100", "books,abc", "toys,x", "garden"])
  |> should.equal(["books: 100"])
}
