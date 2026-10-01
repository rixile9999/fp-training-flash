import gleam/dict.{type Dict}
import gleam/list
import gleam/result
import gleam/set.{type Set}
import gleam/string

/// 网格位置 #(行, 列)。最上面一行和最左边一列为 0。
pub type Pos =
  #(Int, Int)

/// 把网格转换成从位置映射到格子字符的 dict。
pub fn parse_grid(grid: List(String)) -> Dict(Pos, String) {
  list.index_fold(grid, dict.new(), fn(cells, line, row) {
    list.index_fold(string.to_graphemes(line), cells, fn(cells, char, col) {
      dict.insert(cells, #(row, col), char)
    })
  })
}

/// 字符 `char` 所在格子的位置。没有时返回 Error(Nil)。
pub fn find_cell(cells: Dict(Pos, String), char: String) -> Result(Pos, Nil) {
  dict.fold(cells, Error(Nil), fn(found, pos, c) {
    case c == char {
      True -> Ok(pos)
      False -> found
    }
  })
}

pub fn shortest_path(grid: List(String)) -> Result(Int, Nil) {
  todo
}
