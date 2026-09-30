import edit_distance.{Costs}
import gleam/string
import gleeunit/should

pub fn unit_costs_test() {
  edit_distance.distance_with(
    from: "parcel",
    to: "pencil",
    costs: Costs(insert: 1, delete: 1, substitute: 1),
  )
  |> should.equal(3)
}

pub fn expensive_substitution_test() {
  edit_distance.distance_with(
    from: "cat",
    to: "cut",
    costs: Costs(insert: 1, delete: 1, substitute: 5),
  )
  |> should.equal(2)
}

pub fn insert_direction_test() {
  edit_distance.distance_with(
    from: "ab",
    to: "abc",
    costs: Costs(insert: 1, delete: 10, substitute: 10),
  )
  |> should.equal(1)
}

pub fn delete_direction_test() {
  edit_distance.distance_with(
    from: "abc",
    to: "ab",
    costs: Costs(insert: 1, delete: 10, substitute: 10),
  )
  |> should.equal(10)
}

pub fn insert_cost_base_case_test() {
  edit_distance.distance_with(
    from: "",
    to: "abc",
    costs: Costs(insert: 2, delete: 3, substitute: 1),
  )
  |> should.equal(6)
}

pub fn delete_cost_base_case_test() {
  edit_distance.distance_with(
    from: "abc",
    to: "",
    costs: Costs(insert: 2, delete: 3, substitute: 1),
  )
  |> should.equal(9)
}

pub fn long_strings_test() {
  edit_distance.distance_with(
    from: generated(200, 5),
    to: generated(200, 8),
    costs: Costs(insert: 2, delete: 3, substitute: 4),
  )
  |> should.equal(469)
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
