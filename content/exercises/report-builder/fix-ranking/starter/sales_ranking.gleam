import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string

pub fn parse_line(line: String) -> Result(#(String, Int), Nil) {
  case string.split(line, ",") {
    [product, quantity] -> int.parse(quantity) |> result.map(fn(q) { #(product, q) })
    _ -> Error(Nil)
  }
}

pub fn total_by_product(rows: List(#(String, Int))) -> Dict(String, Int) {
  list.fold(rows, dict.new(), fn(totals, row) {
    let #(product, quantity) = row
    dict.upsert(totals, product, fn(current) {
      case current {
        Some(total) -> total + quantity
        None -> quantity
      }
    })
  })
}

pub fn rank(totals: List(#(String, Int))) -> List(#(String, Int)) {
  list.sort(totals, fn(a, b) { int.compare(a.1, b.1) })
}

pub fn format_row(position: Int, row: #(String, Int)) -> String {
  let #(product, quantity) = row
  int.to_string(position) <> ". " <> product <> " (" <> int.to_string(quantity) <> ")"
}

pub fn build_ranking(lines: List(String)) -> List(String) {
  lines
  |> list.filter_map(parse_line)
  |> total_by_product
  |> dict.to_list
  |> rank
  |> list.index_map(fn(row, index) { format_row(index, row) })
}
