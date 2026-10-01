import gleam/dict.{type Dict}
import gleam/list
import gleam/set.{type Set}
import gleam/string

pub fn reachable_count(floor: List(String), max_steps: Int) -> Int {
  todo
}

// ---- 已提供的工具：不可变队列 ----

/// 由两个列表构成的不可变先进先出队列。
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}

pub fn new_queue() -> Queue(a) {
  Queue(front: [], back: [])
}

/// 放到队尾。O(1)。
pub fn push(queue: Queue(a), item: a) -> Queue(a) {
  Queue(..queue, back: [item, ..queue.back])
}

/// 队首元素和剩余的队列。队列为空时返回 Error(Nil)。摊还 O(1)。
pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  case queue.front, queue.back {
    [first, ..rest], back -> Ok(#(first, Queue(front: rest, back: back)))
    [], [] -> Error(Nil)
    [], back -> pop(Queue(front: list.reverse(back), back: []))
  }
}

// ---- 已提供的工具：网格 ----

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

/// 上下左右邻格中，位于网格内且不是货架（#）的格子。
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
