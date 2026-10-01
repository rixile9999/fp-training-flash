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
  let cells = parse_grid(grid)
  use start <- result.try(find_cell(cells, "S"))
  use goal <- result.try(find_cell(cells, "G"))
  search(cells, goal, [start], [], set.from_list([start]), 0)
}

// 用双列表队列做广度优先搜索：front 是取出的顺序，back 是放入的逆序。
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
