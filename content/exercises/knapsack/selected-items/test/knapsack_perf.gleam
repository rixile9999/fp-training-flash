import gleam/int
import gleam/list
import knapsack.{Cargo}

/// 화물 size개, 무게 한도 size * 6
pub fn setup(size: Int) -> #(List(knapsack.Cargo), Int) {
  #(generate_loop(1, size, 99, []), size * 6)
}

pub fn run(input: #(List(knapsack.Cargo), Int)) -> knapsack.Selection {
  knapsack.best_selection(input.0, input.1)
}

fn generate_loop(i: Int, n: Int, seed: Int, acc: List(knapsack.Cargo)) {
  case i > n {
    True -> list.reverse(acc)
    False -> {
      let weight_seed = next(seed)
      let value_seed = next(weight_seed)
      let item =
        Cargo(
          "c" <> int.to_string(i),
          1 + value_seed % 1000,
          1 + weight_seed % 30,
        )
      generate_loop(i + 1, n, value_seed, [item, ..acc])
    }
  }
}

fn next(seed: Int) -> Int {
  { seed * 1_103_515_245 + 12_345 } % 2_147_483_648
}
