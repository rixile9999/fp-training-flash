import gleam/int
import gleam/list

pub type ChangeError {
  ImpossibleTarget
}

// 모든 동전을 첫 동전 후보로 보는 것은 맞지만, 표 없이 재귀만 해서
// 같은 금액을 반복 계산하고 호출 수가 지수적으로 늘어난다.
pub fn min_coins(coins: List(Int), target: Int) -> Result(Int, ChangeError) {
  case fewest(coins, target) {
    Ok(count) -> Ok(count)
    Error(Nil) -> Error(ImpossibleTarget)
  }
}

fn fewest(coins: List(Int), target: Int) -> Result(Int, Nil) {
  case target {
    0 -> Ok(0)
    _ if target < 0 -> Error(Nil)
    _ ->
      coins
      |> list.filter_map(fn(coin) {
        case fewest(coins, target - coin) {
          Ok(count) -> Ok(count + 1)
          Error(Nil) -> Error(Nil)
        }
      })
      |> list.reduce(int.min)
  }
}
