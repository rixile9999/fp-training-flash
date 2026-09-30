import gleam/dict
import gleam/int
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string

pub type Sale {
  Sale(category: String, amount: Int)
}

pub fn parse_line(line: String) -> Result(Sale, Nil) {
  case string.split(line, ",") {
    [category, amount] -> int.parse(amount) |> result.map(Sale(category, _))
    _ -> Error(Nil)
  }
}

pub fn total_by_category(sales: List(Sale)) -> List(#(String, Int)) {
  sales
  |> list.fold(dict.new(), fn(totals, sale) {
    dict.upsert(totals, sale.category, fn(current) {
      case current {
        Some(total) -> total + sale.amount
        None -> sale.amount
      }
    })
  })
  |> dict.to_list
  |> list.sort(fn(a, b) { string.compare(a.0, b.0) })
}

pub fn format_row(row: #(String, Int)) -> String {
  let #(category, total) = row
  category <> ": " <> int.to_string(total)
}

pub fn build_report(lines: List(String)) -> List(String) {
  lines
  |> list.filter_map(parse_line)
  |> total_by_category
  |> list.map(format_row)
}
