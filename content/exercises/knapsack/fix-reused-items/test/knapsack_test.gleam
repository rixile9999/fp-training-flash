import gleeunit/should
import knapsack.{Item}

pub fn single_item_once_test() {
  knapsack.maximum_value([Item(value: 10, weight: 3)], 9)
  |> should.equal(10)
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

pub fn two_items_each_once_test() {
  knapsack.maximum_value(
    [Item(value: 6, weight: 2), Item(value: 10, weight: 5)],
    10,
  )
  |> should.equal(16)
}

pub fn no_items_test() {
  knapsack.maximum_value([], 50)
  |> should.equal(0)
}

pub fn too_heavy_test() {
  knapsack.maximum_value([Item(value: 100, weight: 11)], 10)
  |> should.equal(0)
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
