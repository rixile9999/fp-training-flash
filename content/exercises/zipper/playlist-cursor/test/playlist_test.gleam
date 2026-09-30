import gleeunit/should
import playlist

fn start(songs: List(String)) -> playlist.Cursor(String) {
  let assert Ok(cursor) = playlist.from_list(songs)
  cursor
}

pub fn next_moves_forward_test() {
  let assert Ok(cursor) = playlist.next(start(["봄", "여름", "가을"]))
  playlist.current(cursor)
  |> should.equal("여름")
}

pub fn previous_at_first_song_fails_test() {
  start(["봄", "여름"])
  |> playlist.previous
  |> should.equal(Error(Nil))
}

pub fn to_list_after_moves_test() {
  let assert Ok(cursor) = playlist.next(start(["봄", "여름", "가을"]))
  let assert Ok(cursor) = playlist.next(cursor)
  playlist.to_list(cursor)
  |> should.equal(["봄", "여름", "가을"])
}

pub fn next_at_last_song_fails_test() {
  let assert Ok(cursor) = playlist.next(start(["봄", "여름"]))
  playlist.next(cursor)
  |> should.equal(Error(Nil))
}

pub fn previous_returns_to_earlier_song_test() {
  let assert Ok(cursor) = playlist.next(start(["봄", "여름", "가을"]))
  let assert Ok(cursor) = playlist.next(cursor)
  let assert Ok(cursor) = playlist.previous(cursor)
  #(playlist.current(cursor), playlist.to_list(cursor))
  |> should.equal(#("여름", ["봄", "여름", "가을"]))
}

pub fn remove_moves_to_next_song_test() {
  let assert Ok(cursor) = playlist.next(start(["봄", "여름", "가을"]))
  let assert Ok(cursor) = playlist.remove_current(cursor)
  #(playlist.current(cursor), playlist.to_list(cursor))
  |> should.equal(#("가을", ["봄", "가을"]))
}

pub fn remove_last_song_moves_back_test() {
  let assert Ok(cursor) = playlist.next(start(["봄", "여름", "가을"]))
  let assert Ok(cursor) = playlist.next(cursor)
  let assert Ok(cursor) = playlist.remove_current(cursor)
  #(playlist.current(cursor), playlist.to_list(cursor))
  |> should.equal(#("여름", ["봄", "여름"]))
}

pub fn remove_only_song_fails_test() {
  start(["봄"])
  |> playlist.remove_current
  |> should.equal(Error(Nil))
}
