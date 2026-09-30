import gleam/int
import gleam/list

pub type ChangeError {
  ImpossibleTarget
}

pub fn find_fewest_coins(
  coins: List(Int),
  target: Int,
) -> Result(List(Int), ChangeError) {
  case fewest(coins, target) {
    Ok(used) -> Ok(list.sort(used, int.compare))
    Error(Nil) -> Error(ImpossibleTarget)
  }
}

// 정의를 그대로 재귀로 옮겼다. 답은 맞지만 같은 금액을 셀 수 없이 다시 계산해서
// 금액이 커지면 호출 수가 지수적으로 늘어난다.
fn fewest(coins: List(Int), target: Int) -> Result(List(Int), Nil) {
  case target {
    0 -> Ok([])
    _ if target < 0 -> Error(Nil)
    _ ->
      list.fold(coins, Error(Nil), fn(best, coin) {
        case fewest(coins, target - coin), best {
          Error(Nil), _ -> best
          Ok(rest), Ok(current) ->
            case list.length(rest) + 1 < list.length(current) {
              True -> Ok([coin, ..rest])
              False -> best
            }
          Ok(rest), Error(Nil) -> Ok([coin, ..rest])
        }
      })
  }
}
