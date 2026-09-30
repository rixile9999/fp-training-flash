import gleam/list

/// 재생 목록 위의 커서. `current`가 지금 곡이다.
/// `before`는 지금 곡 앞의 곡들을 **가까운 곡부터**(역순) 담고, `after`는 뒤의 곡들을 순서대로 담는다.
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
