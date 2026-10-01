import gleam/dict.{type Dict}
import gleam/list
import gleam/set.{type Set}
import gleam/string

pub fn reachable_count(floor: List(String), max_steps: Int) -> Int {
  todo
}

// ---- Provided tools: immutable queue ----

/// An immutable first-in, first-out queue built from two lists.
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}

pub fn new_queue() -> Queue(a) {
  Queue(front: [], back: [])
}

/// Adds an item at the back. O(1).
pub fn push(queue: Queue(a), item: a) -> Queue(a) {
  Queue(..queue, back: [item, ..queue.back])
}

/// The front element and the rest of the queue, or Error(Nil) if it is empty. Amortized O(1).
pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  case queue.front, queue.back {
    [first, ..rest], back -> Ok(#(first, Queue(front: rest, back: back)))
    [], [] -> Error(Nil)
    [], back -> pop(Queue(front: list.reverse(back), back: []))
  }
}

// ---- Provided tools: grid ----

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

/// The up/down/left/right neighbors that are inside the grid and are not shelves (#).
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
