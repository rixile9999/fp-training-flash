import edit_distance
import gleam/string

pub fn setup(size: Int) -> #(String, String) {
  #(generated(size, 11), generated(size, 23))
}

pub fn run(input: #(String, String)) -> Int {
  edit_distance.distance(from: input.0, to: input.1)
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
