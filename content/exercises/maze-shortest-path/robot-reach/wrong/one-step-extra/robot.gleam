import gleam/dict.{type Dict}
import gleam/list
import gleam/set.{type Set}
import gleam/string

pub fn reachable_count(floor: List(String), max_steps: Int) -> Int {
  let cells = parse_grid(floor)
  case find_cell(cells, "S") {
    Error(Nil) -> 0
    Ok(start) ->
      explore(
        cells,
        max_steps,
        push(new_queue(), #(start, 0)),
        set.from_list([start]),
        0,
      )
  }
}

fn explore(
  cells: Dict(Pos, String),
  max_steps: Int,
  queue: Queue(#(Pos, Int)),
  seen: Set(Pos),
  count: Int,
) -> Int {
  case pop(queue) {
    Error(Nil) -> count
    Ok(#(#(pos, dist), rest)) -> {
      let next = case dist <= max_steps {
        True ->
          open_neighbors(cells, pos)
          |> list.filter(fn(p) { !set.contains(seen, p) })
        False -> []
      }
      let seen = list.fold(next, seen, set.insert)
      let queue = list.fold(next, rest, fn(q, p) { push(q, #(p, dist + 1)) })
      explore(cells, max_steps, queue, seen, count + 1)
    }
  }
}

// ---- 주어진 도구: 불변 큐 ----

/// 리스트 두 개로 만든 불변 선입선출 큐.
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}

pub fn new_queue() -> Queue(a) {
  Queue(front: [], back: [])
}

/// 맨 뒤에 넣는다. O(1).
pub fn push(queue: Queue(a), item: a) -> Queue(a) {
  Queue(..queue, back: [item, ..queue.back])
}

/// 맨 앞 원소와 나머지 큐. 비었으면 Error(Nil). 상각 O(1).
pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  case queue.front, queue.back {
    [first, ..rest], back -> Ok(#(first, Queue(front: rest, back: back)))
    [], [] -> Error(Nil)
    [], back -> pop(Queue(front: list.reverse(back), back: []))
  }
}

// ---- 주어진 도구: 격자 ----

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

/// 상하좌우 이웃 중 격자 안에 있고 선반(#)이 아닌 칸.
pub fn open_neighbors(cells: Dict(Pos, String), pos: Pos) -> List(Pos) {
  let #(row, col) = pos
  [#(row - 1, col), #(row + 1, col), #(row, col - 1), #(row, col + 1)]
  |> list.filter(fn(p) {
    case dict.get(cells, p) {
      Ok("#") | Error(Nil) -> False
      Ok(_) -> True
    }
  })
}
