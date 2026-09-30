import gleam/int
import gleam/list
import gleeunit/should
import merge_sort

pub fn split_even_test() {
  merge_sort.split([4, 1, 3, 2])
  |> should.equal(#([4, 1], [3, 2]))
}

pub fn split_odd_test() {
  merge_sort.split([5, 1, 4])
  |> should.equal(#([5], [1, 4]))
}

pub fn merge_test() {
  merge_sort.merge([1, 4, 9], [2, 3, 10])
  |> should.equal([1, 2, 3, 4, 9, 10])
}

pub fn sort_test() {
  merge_sort.sort([5, 2, 9, 1, 5, 6])
  |> should.equal([1, 2, 5, 5, 6, 9])
}

pub fn sort_single_test() {
  merge_sort.sort([7])
  |> should.equal([7])
}

pub fn sort_duplicates_and_negatives_test() {
  merge_sort.sort([3, -1, 3, 0, -1, 12, -8])
  |> should.equal([-8, -1, -1, 0, 3, 3, 12])
}

pub fn sort_large_list_test() {
  let items = pseudo_random(150_000)
  merge_sort.sort(items)
  |> should.equal(list.sort(items, int.compare))
}

/// 고정 시드로 만든 결정적 난수 목록
fn pseudo_random(n: Int) -> List(Int) {
  pseudo_random_loop(n, 42, [])
}

fn pseudo_random_loop(n: Int, seed: Int, acc: List(Int)) -> List(Int) {
  case n {
    0 -> acc
    _ -> {
      let next = { seed * 1_103_515_245 + 12_345 } % 2_147_483_648
      pseudo_random_loop(n - 1, next, [next % 1_000_000, ..acc])
    }
  }
}
