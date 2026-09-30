import gleam/list
import gleeunit/should
import knapsack.{Item}

pub fn no_items_test() {
  knapsack.maximum_value([], 100)
  |> should.equal(0)
}

pub fn example_test() {
  knapsack.maximum_value(
    [
      Item(value: 10, weight: 5),
      Item(value: 40, weight: 4),
      Item(value: 30, weight: 6),
      Item(value: 50, weight: 4),
    ],
    10,
  )
  |> should.equal(90)
}

pub fn eight_items_test() {
  knapsack.maximum_value(
    [
      Item(value: 350, weight: 25),
      Item(value: 400, weight: 35),
      Item(value: 450, weight: 45),
      Item(value: 20, weight: 5),
      Item(value: 70, weight: 25),
      Item(value: 8, weight: 3),
      Item(value: 5, weight: 2),
      Item(value: 5, weight: 2),
    ],
    104,
  )
  |> should.equal(900)
}

pub fn one_item_too_heavy_test() {
  knapsack.maximum_value([Item(value: 1, weight: 100)], 10)
  |> should.equal(0)
}

pub fn greedy_by_weight_test() {
  knapsack.maximum_value(
    [
      Item(value: 5, weight: 2),
      Item(value: 5, weight: 2),
      Item(value: 5, weight: 2),
      Item(value: 5, weight: 2),
      Item(value: 21, weight: 10),
    ],
    10,
  )
  |> should.equal(21)
}

pub fn greedy_by_value_test() {
  knapsack.maximum_value(
    [
      Item(value: 20, weight: 2),
      Item(value: 20, weight: 2),
      Item(value: 20, weight: 2),
      Item(value: 20, weight: 2),
      Item(value: 50, weight: 10),
    ],
    10,
  )
  |> should.equal(80)
}

pub fn item_used_once_test() {
  knapsack.maximum_value([Item(value: 10, weight: 3)], 9)
  |> should.equal(10)
}

pub fn many_items_test() {
  knapsack.maximum_value(generated_items(50, 2024), 400)
  |> should.equal(2054)
}

/// 고정 시드로 만든 물건 n개 (무게 1..30, 가치 1..100)
fn generated_items(n: Int, seed: Int) -> List(knapsack.Item) {
  generate_loop(n, seed, [])
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
