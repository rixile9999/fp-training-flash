import gleam/int
import gleam/list
import gleam/string
import maze

// size x size 격자. 벽이 드문드문 있고 S는 왼쪽 위, G는 오른쪽 아래에 있다.
pub fn setup(size: Int) -> List(String) {
  list.map(indices(size), fn(row) {
    list.map(indices(size), fn(col) { cell(size, row, col) })
    |> string.concat
  })
}

pub fn run(grid: List(String)) -> Result(Int, Nil) {
  maze.shortest_path(grid)
}

fn indices(size: Int) -> List(Int) {
  int.range(from: size - 1, to: -1, with: [], run: list.prepend)
}

fn cell(size: Int, row: Int, col: Int) -> String {
  case row == 0 && col == 0, row == size - 1 && col == size - 1 {
    True, _ -> "S"
    _, True -> "G"
    _, _ ->
      case row % 4 == 2 && col % 6 == 3 {
        True -> "#"
        False -> "."
      }
  }
}
