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

pub fn parse_all(lines: List(String)) -> #(List(Sale), Int) {
  let #(sales, skipped) =
    list.fold(lines, #([], 0), fn(acc, line) {
      let #(sales, skipped) = acc
      case line, parse_line(line) {
        _, Ok(sale) -> #([sale, ..sales], skipped)
        _, Error(Nil) -> #(sales, skipped + 1)
      }
    })
  #(list.reverse(sales), skipped)
}

pub fn footer(sales: List(Sale), skipped: Int) -> List(String) {
  let total = sales |> list.map(fn(sale) { sale.amount }) |> int.sum
  ["total: " <> int.to_string(total), "skipped: " <> int.to_string(skipped)]
}

pub fn build_report(lines: List(String)) -> List(String) {
  let #(sales, skipped) = parse_all(lines)
  let rows = sales |> total_by_category |> list.map(format_row)
  list.append(rows, footer(sales, skipped))
}
