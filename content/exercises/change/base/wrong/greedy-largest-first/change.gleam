import gleam/int
import gleam/list

pub type ChangeError {
  ImpossibleTarget
}

// 남은 금액 이하인 가장 큰 동전부터 계속 고른다.
pub fn find_fewest_coins(
  coins: List(Int),
  target: Int,
) -> Result(List(Int), ChangeError) {
  case target < 0 {
    True -> Error(ImpossibleTarget)
    False ->
      greedy(list.sort(coins, fn(a, b) { int.compare(b, a) }), target, [])
  }
}

fn greedy(
  descending: List(Int),
  remaining: Int,
  used: List(Int),
) -> Result(List(Int), ChangeError) {
  case remaining {
    0 -> Ok(used)
    _ ->
      case list.find(descending, fn(coin) { coin <= remaining }) {
        Ok(coin) -> greedy(descending, remaining - coin, [coin, ..used])
        Error(Nil) -> Error(ImpossibleTarget)
      }
  }
}
