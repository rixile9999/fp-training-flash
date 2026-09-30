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
    False -> greedy(list.sort(coins, fn(a, b) { int.compare(b, a) }), target, 0)
  }
}

fn greedy(
  descending: List(Int),
  remaining: Int,
  count: Int,
) -> Result(Int, ChangeError) {
  case remaining {
    0 -> Ok(count)
    _ ->
      case list.find(descending, fn(coin) { coin <= remaining }) {
        Ok(coin) -> greedy(descending, remaining - coin, count + 1)
        Error(Nil) -> Error(ImpossibleTarget)
      }
  }
}
