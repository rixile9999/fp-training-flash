import gleam/dict
import gleam/int
import gleam/list
import gleam/result

pub type ChangeError {
  ImpossibleTarget
}

// 표에 없는 금액을 0개로 읽어서, 만들 수 없는 금액을 거쳐 가는 후보가 생긴다.
pub fn min_coins(coins: List(Int), target: Int) -> Result(Int, ChangeError) {
  case target < 0 {
    True -> Error(ImpossibleTarget)
    False -> {
      let table =
        int.range(
          from: 1,
          to: target + 1,
          with: dict.from_list([#(0, 0)]),
          run: fn(table, amount) {
            let candidates =
              coins
              |> list.filter(fn(coin) { coin <= amount })
              |> list.map(fn(coin) {
                result.unwrap(dict.get(table, amount - coin), 0) + 1
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
