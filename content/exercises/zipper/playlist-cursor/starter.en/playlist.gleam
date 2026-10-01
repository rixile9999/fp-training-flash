import gleam/list

/// A cursor on a playlist. `current` is the current song.
/// `before` holds the songs before the current one, **nearest first** (in reverse order), and `after` holds the songs after it, in order.
pub opaque type Cursor(a) {
  Cursor(before: List(a), current: a, after: List(a))
}

pub fn from_list(songs: List(a)) -> Result(Cursor(a), Nil) {
  case songs {
    [] -> Error(Nil)
    [first, ..rest] -> Ok(Cursor(before: [], current: first, after: rest))
  }
}

pub fn current(cursor: Cursor(a)) -> a {
  cursor.current
}

pub fn next(cursor: Cursor(a)) -> Result(Cursor(a), Nil) {
  todo
}

pub fn previous(cursor: Cursor(a)) -> Result(Cursor(a), Nil) {
  todo
}

pub fn to_list(cursor: Cursor(a)) -> List(a) {
  todo
}

pub fn remove_current(cursor: Cursor(a)) -> Result(Cursor(a), Nil) {
  todo
}
