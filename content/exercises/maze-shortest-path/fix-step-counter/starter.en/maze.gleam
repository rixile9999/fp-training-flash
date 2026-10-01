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
  let cells = parse_grid(grid)
  use start <- result.try(find_cell(cells, "S"))
  use goal <- result.try(find_cell(cells, "G"))
  search(cells, goal, [start], [], set.from_list([start]), 0)
}

// Breadth-first search with a two-list queue: front is in the order to take out, back is in reverse order of insertion.
fn search(
  cells: Dict(Pos, String),
  goal: Pos,
  front: List(Pos),
  back: List(Pos),
  seen: Set(Pos),
  steps: Int,
) -> Result(Int, Nil) {
  case front, back {
    [], [] -> Error(Nil)
    [], _ -> search(cells, goal, list.reverse(back), [], seen, steps)
    [pos, ..], _ if pos == goal -> Ok(steps)
    [pos, ..rest], _ -> {
      let next =
        open_neighbors(cells, pos)
        |> list.filter(fn(p) { !set.contains(seen, p) })
      let seen = list.fold(next, seen, set.insert)
      let back = list.fold(next, back, fn(acc, p) { [p, ..acc] })
      search(cells, goal, rest, back, seen, steps + 1)
    }
  }
}
fn open_neighbors(cells: Dict(Pos, String), pos: Pos) -> List(Pos) {
  let #(row, col) = pos
  [#(row - 1, col), #(row + 1, col), #(row, col - 1), #(row, col + 1)]
  |> list.filter(fn(p) {
    case dict.get(cells, p) {
      Ok("#") | Error(Nil) -> False
      Ok(_) -> True
    }
  })
}
