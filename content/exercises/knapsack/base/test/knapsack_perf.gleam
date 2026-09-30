import gleam/list
import knapsack.{Item}

/// 물건 size개, 무게 한도 size * 6
pub fn setup(size: Int) -> #(List(knapsack.Item), Int) {
  #(generate_loop(size, 99, []), size * 6)
}

pub fn run(input: #(List(knapsack.Item), Int)) -> Int {
  knapsack.maximum_value(input.0, input.1)
}

fn generate_loop(n: Int, seed: Int, acc: List(knapsack.Item)) {
  case n {
    0 -> list.reverse(acc)
    _ -> {
      let weight_seed = next(seed)
      let value_seed = next(weight_seed)
      let item = Item(value: 1 + value_seed % 100, weight: 1 + weight_seed % 30)
      generate_loop(n - 1, value_seed, [item, ..acc])
    }
  }
}

fn next(seed: Int) -> Int {
  { seed * 1_103_515_245 + 12_345 } % 2_147_483_648
}
