import gleam/int
import gleam/list
import gleam/string
import gleeunit/should
import knapsack.{Cargo, Selection}

pub fn picks_best_pair_test() {
  knapsack.best_selection(
    [Cargo("a", 60, 5), Cargo("b", 50, 4), Cargo("c", 70, 6), Cargo("d", 30, 3)],
    10,
  )
  |> should.equal(Selection(total_value: 120, ids: ["b", "c"]))
}

pub fn not_greedy_test() {
  knapsack.best_selection(
    [
      Cargo("s1", 5, 2),
      Cargo("s2", 5, 2),
      Cargo("s3", 5, 2),
      Cargo("s4", 5, 2),
      Cargo("big", 21, 10),
    ],
    10,
  )
  |> should.equal(Selection(total_value: 21, ids: ["big"]))
}

pub fn ids_in_input_order_test() {
  knapsack.best_selection(
    [
      Cargo("x", 10, 1),
      Cargo("heavy", 99, 50),
      Cargo("y", 20, 1),
      Cargo("z", 30, 1),
    ],
    3,
  )
  |> should.equal(Selection(total_value: 60, ids: ["x", "y", "z"]))
}

pub fn empty_cargo_test() {
  knapsack.best_selection([], 10)
  |> should.equal(Selection(total_value: 0, ids: []))
}

pub fn nothing_fits_test() {
  knapsack.best_selection([Cargo("heavy", 100, 20)], 10)
  |> should.equal(Selection(total_value: 0, ids: []))
}

pub fn uses_each_once_test() {
  knapsack.best_selection([Cargo("box", 10, 3)], 9)
  |> should.equal(Selection(total_value: 10, ids: ["box"]))
}

pub fn many_cargo_test() {
  knapsack.best_selection(generated_cargo(40, 1), 250)
  |> should.equal(
    Selection(total_value: 16_006, ids: [
      "c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c12",
      "c13", "c16", "c17", "c18", "c19", "c20", "c21", "c24", "c26", "c27",
      "c29", "c32", "c34", "c35", "c36", "c39",
    ]),
  )
}

/// 고정 시드로 만든 화물 n개: id c01, c02, ... (무게 1..30, 가치 1..1000)
fn generated_cargo(n: Int, seed: Int) -> List(knapsack.Cargo) {
  generate_loop(1, n, seed, [])
}

fn generate_loop(i: Int, n: Int, seed: Int, acc: List(knapsack.Cargo)) {
  case i > n {
    True -> list.reverse(acc)
    False -> {
      let weight_seed = next(seed)
      let value_seed = next(weight_seed)
      let id = "c" <> string.pad_start(int.to_string(i), 2, "0")
      let item = Cargo(id, 1 + value_seed % 1000, 1 + weight_seed % 30)
      generate_loop(i + 1, n, value_seed, [item, ..acc])
    }
  }
}

fn next(seed: Int) -> Int {
  { seed * 1_103_515_245 + 12_345 } % 2_147_483_648
}
