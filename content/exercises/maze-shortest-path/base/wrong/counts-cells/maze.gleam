import gleam/dict.{type Dict}
import gleam/list
import gleam/result
import gleam/set.{type Set}
import gleam/string

/// 격자 위치 #(행, 열). 맨 위 행과 맨 왼쪽 열이 0이다.
pub type Pos =
  #(Int, Int)

/// 격자를 위치에서 칸 문자로 가는 dict로 바꾼다.
pub fn parse_grid(grid: List(String)) -> Dict(Pos, String) {
  list.index_fold(grid, dict.new(), fn(cells, line, row) {
    list.index_fold(string.to_graphemes(line), cells, fn(cells, char, col) {
      dict.insert(cells, #(row, col), char)
    })
  })
}

/// 문자 `char`가 있는 칸의 위치. 없으면 Error(Nil).
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
  search(cells, goal, [#(start, 1)], [], set.from_list([start]))
}

// front는 꺼낼 순서, back은 넣은 역순인 두 리스트 큐로 너비 우선 탐색을 한다.
fn search(
  cells: Dict(Pos, String),
  goal: Pos,
  front: List(#(Pos, Int)),
  back: List(#(Pos, Int)),
  seen: Set(Pos),
) -> Result(Int, Nil) {
  case front, back {
    [], [] -> Error(Nil)
    [], _ -> search(cells, goal, list.reverse(back), [], seen)
    [#(pos, dist), ..], _ if pos == goal -> Ok(dist)
    [#(pos, dist), ..rest], _ -> {
      let next =
        open_neighbors(cells, pos)
        |> list.filter(fn(p) { !set.contains(seen, p) })
      let seen = list.fold(next, seen, set.insert)
      let back = list.fold(next, back, fn(acc, p) { [#(p, dist + 1), ..acc] })
      search(cells, goal, rest, back, seen)
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
