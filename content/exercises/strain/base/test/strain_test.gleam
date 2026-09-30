import gleam/int
import gleam/list
import gleam/string
import gleeunit/should
import strain.{discard, keep}

pub fn keep_on_empty_list_test() {
  keep([], fn(_) { True })
  |> should.equal([])
}

pub fn keeps_odd_numbers_test() {
  keep([1, 2, 3], int.is_odd)
  |> should.equal([1, 3])
}

pub fn discards_odd_numbers_test() {
  discard([1, 2, 3], int.is_odd)
  |> should.equal([2])
}

pub fn keeps_words_starting_with_z_test() {
  keep(["apple", "zebra", "banana", "zombies", "cherimoya", "zelot"], fn(word) {
    string.starts_with(word, "z")
  })
  |> should.equal(["zebra", "zombies", "zelot"])
}

pub fn keeps_nothing_test() {
  keep([1, 2, 3], fn(_) { False })
  |> should.equal([])
}

pub fn discards_nothing_test() {
  discard([1, 2, 3], fn(_) { False })
  |> should.equal([1, 2, 3])
}

pub fn discards_lists_containing_five_test() {
  discard([[1, 2, 3], [5, 5, 5], [2, 1, 2], [1, 5, 2], [2, 2, 1]], fn(row) {
    list.contains(row, 5)
  })
  |> should.equal([[1, 2, 3], [2, 1, 2], [2, 2, 1]])
}
