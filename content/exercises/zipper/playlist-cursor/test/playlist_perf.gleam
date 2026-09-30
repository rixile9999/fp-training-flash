import gleam/int
import gleam/list
import playlist.{type Cursor}

pub fn setup(size: Int) -> List(Int) {
  int.range(from: size - 1, to: -1, with: [], run: list.prepend)
}

// 첫 곡부터 끝까지 next로 이동한 뒤, 처음까지 previous로 돌아온다.
pub fn run(songs: List(Int)) -> Int {
  case playlist.from_list(songs) {
    Ok(cursor) -> {
      let #(at_end, forward) = walk(cursor, playlist.next, 0)
      let #(_, backward) = walk(at_end, playlist.previous, 0)
      forward + backward
    }
    Error(Nil) -> 0
  }
}

fn walk(
  cursor: Cursor(Int),
  step: fn(Cursor(Int)) -> Result(Cursor(Int), Nil),
  total: Int,
) -> #(Cursor(Int), Int) {
  case step(cursor) {
    Ok(moved) -> walk(moved, step, total + playlist.current(moved))
    Error(Nil) -> #(cursor, total)
  }
}
