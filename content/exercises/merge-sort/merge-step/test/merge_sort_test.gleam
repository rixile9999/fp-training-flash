import gleeunit/should
import merge_sort

pub fn merge_with_empty_left_test() {
  merge_sort.merge([], [1, 2])
  |> should.equal([1, 2])
}

pub fn merge_interleaves_test() {
  merge_sort.merge([1, 4, 9], [2, 3, 10])
  |> should.equal([1, 2, 3, 4, 9, 10])
}

pub fn merge_with_empty_right_test() {
  merge_sort.merge([5, 6], [])
  |> should.equal([5, 6])
}

pub fn merge_leftover_tail_test() {
  merge_sort.merge([3, 4, 5, 6], [1, 2])
  |> should.equal([1, 2, 3, 4, 5, 6])
}

pub fn merge_keeps_duplicates_test() {
  merge_sort.merge([1, 3, 3], [3, 4])
  |> should.equal([1, 3, 3, 3, 4])
}

pub fn merge_negative_numbers_test() {
  merge_sort.merge([-5, 0, 8], [-7, -3, 7])
  |> should.equal([-7, -5, -3, 0, 7, 8])
}
