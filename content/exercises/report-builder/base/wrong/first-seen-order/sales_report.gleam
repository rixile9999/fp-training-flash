import gleam/int
import gleam/list
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

// 처음 등장한 순서대로 합계를 쌓고 정렬하지 않는다.
pub fn total_by_category(sales: List(Sale)) -> List(#(String, Int)) {
  list.fold(sales, [], fn(totals, sale) {
    case list.key_find(totals, sale.category) {
      Ok(total) ->
        list.key_set(totals, sale.category, total + sale.amount)
      Error(Nil) -> list.append(totals, [#(sale.category, sale.amount)])
    }
  })
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
