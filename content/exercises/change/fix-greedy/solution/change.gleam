import gleam/dict
import gleam/int
import gleam/list
import gleam/result

pub type ChangeError {
  ImpossibleTarget
}

pub fn min_coins(coins: List(Int), target: Int) -> Result(Int, ChangeError) {
  case target < 0 {
    True -> Error(ImpossibleTarget)
    False -> {
      // 표: 금액 -> 최소 동전 개수. 만들 수 없는 금액은 표에 없다.
      let table =
        int.range(
          from: 1,
          to: target + 1,
          with: dict.from_list([#(0, 0)]),
          run: fn(table, amount) {
            let candidates =
              list.filter_map(coins, fn(coin) {
                dict.get(table, amount - coin)
                |> result.map(fn(count) { count + 1 })
              })
            case list.reduce(candidates, int.min) {
              Ok(best) -> dict.insert(table, amount, best)
              Error(Nil) -> table
            }
          },
        )
      dict.get(table, target)
      |> result.replace_error(ImpossibleTarget)
    }
  }
}
