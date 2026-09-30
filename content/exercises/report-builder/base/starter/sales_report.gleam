pub type Sale {
  Sale(category: String, amount: Int)
}

pub fn parse_line(line: String) -> Result(Sale, Nil) {
  todo
}

pub fn total_by_category(sales: List(Sale)) -> List(#(String, Int)) {
  todo
}

pub fn format_row(row: #(String, Int)) -> String {
  todo
}

pub fn build_report(lines: List(String)) -> List(String) {
  todo
}
