import gleam/dict.{type Dict}
import gleam/list
import gleam/result
import gleam/set.{type Set}
import gleam/string

/// A grid position #(row, column). The top row and the leftmost column are 0.
pub type Pos =
  #(Int, Int)

/// Turns the grid into a dict from positions to cell characters.
pub fn parse_grid(grid: List(String)) -> Dict(Pos, String) {
  list.index_fold(grid, dict.new(), fn(cells, line, row) {
    list.index_fold(string.to_graphemes(line), cells, fn(cells, char, col) {
      dict.insert(cells, #(row, col), char)
    })
  })
}

/// The position of the cell containing the character `char`, or Error(Nil) if there is none.
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
