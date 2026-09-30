import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result

// 금액을 바깥에서 돌고 동전을 안에서 돌아서, 1 + 2와 2 + 1을 다른 방법으로 센다.
pub fn count_ways(coins: List(Int), target: Int) -> Int {
  case target < 0 {
    True -> 0
    False -> {
      let table =
        int.range(
          from: 1,
          to: target + 1,
          with: dict.from_list([#(0, 1)]),
          run: fn(table, amount) {
            let total =
              list.fold(coins, 0, fn(sum, coin) {
                sum + get(table, amount - coin)
              })
            dict.insert(table, amount, total)
          },
        )
      get(table, target)
    }
  }
}

fn get(table: Dict(Int, Int), amount: Int) -> Int {
  dict.get(table, amount) |> result.unwrap(0)
}
