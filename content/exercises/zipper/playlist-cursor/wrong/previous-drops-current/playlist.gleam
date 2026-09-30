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
  case cursor.after {
    [] -> Error(Nil)
    [song, ..rest] ->
      Ok(Cursor(before: [cursor.current, ..cursor.before], current: song, after: rest))
  }
}

pub fn previous(cursor: Cursor(a)) -> Result(Cursor(a), Nil) {
  case cursor.before {
    [] -> Error(Nil)
    [song, ..rest] ->
      Ok(Cursor(before: rest, current: song, after: cursor.after))
  }
}

pub fn to_list(cursor: Cursor(a)) -> List(a) {
  list.reverse(cursor.before)
  |> list.append([cursor.current, ..cursor.after])
}

pub fn remove_current(cursor: Cursor(a)) -> Result(Cursor(a), Nil) {
  case cursor.after, cursor.before {
    [song, ..rest], _ -> Ok(Cursor(..cursor, current: song, after: rest))
    [], [song, ..rest] -> Ok(Cursor(..cursor, before: rest, current: song))
    [], [] -> Error(Nil)
  }
}
