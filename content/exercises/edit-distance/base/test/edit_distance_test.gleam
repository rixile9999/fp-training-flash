import edit_distance
import gleam/string
import gleeunit/should

pub fn identical_test() {
  edit_distance.distance(from: "gleam", to: "gleam")
  |> should.equal(0)
}

pub fn empty_source_test() {
  edit_distance.distance(from: "", to: "abc")
  |> should.equal(3)
}

pub fn one_substitution_test() {
  edit_distance.distance(from: "cart", to: "card")
  |> should.equal(1)
}

pub fn mixed_edits_test() {
  edit_distance.distance(from: "parcel", to: "pencil")
  |> should.equal(3)
}

pub fn empty_target_test() {
  edit_distance.distance(from: "abc", to: "")
  |> should.equal(3)
}

pub fn substitution_counts_once_test() {
  edit_distance.distance(from: "abc", to: "xbz")
  |> should.equal(2)
}

pub fn korean_graphemes_test() {
  edit_distance.distance(from: "배송중", to: "배송완료")
  |> should.equal(2)
}

pub fn long_strings_test() {
  edit_distance.distance(from: generated(300, 11), to: generated(300, 23))
  |> should.equal(211)
}

/// 고정 시드로 만든 길이 n의 문자열 (글자 a..h)
fn generated(n: Int, seed: Int) -> String {
  generate_loop(n, seed, [])
}

fn generate_loop(n: Int, seed: Int, acc: List(String)) -> String {
  case n {
    0 -> string.concat(acc)
    _ -> {
      let seed = { seed * 1_103_515_245 + 12_345 } % 2_147_483_648
      let letter = case seed / 65_536 % 8 {
        0 -> "a"
        1 -> "b"
        2 -> "c"
        3 -> "d"
        4 -> "e"
        5 -> "f"
        6 -> "g"
        _ -> "h"
      }
      generate_loop(n - 1, seed, [letter, ..acc])
    }
  }
}
