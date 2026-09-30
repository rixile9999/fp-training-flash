import edit_distance
import gleam/string
import gleeunit/should

pub fn similar_names_test() {
  edit_distance.distance(from: "usb-c cable 1m", to: "usb-c cable 2m")
  |> should.equal(1)
}

pub fn long_names_test() {
  edit_distance.distance(from: generated(250, 3), to: generated(250, 4))
  |> should.equal(177)
}

pub fn identical_names_test() {
  edit_distance.distance(from: "kitchen towel", to: "kitchen towel")
  |> should.equal(0)
}

pub fn empty_name_test() {
  edit_distance.distance(from: "", to: "towel")
  |> should.equal(5)
}

pub fn korean_names_test() {
  edit_distance.distance(from: "무선 이어폰 프로", to: "무선 이어폰 프로 2")
  |> should.equal(2)
}

pub fn different_names_test() {
  edit_distance.distance(from: "bread knife", to: "beard knife")
  |> should.equal(2)
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
