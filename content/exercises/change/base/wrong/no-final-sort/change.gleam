import gleam/dict.{type Dict}
import gleam/int
import gleam/list

pub type ChangeError {
  ImpossibleTarget
}

/// 표: 금액 -> #(동전 개수, 사용한 동전들). 만들 수 없는 금액은 표에 없다.
type Table =
  Dict(Int, #(Int, List(Int)))

pub fn find_fewest_coins(
  coins: List(Int),
  target: Int,
) -> Result(List(Int), ChangeError) {
  case target < 0 {
    True -> Error(ImpossibleTarget)
    False -> {
      let table =
        int.range(
          from: 1,
          to: target + 1,
          with: dict.from_list([#(0, #(0, []))]),
          run: fn(table, amount) {
            case best_for(coins, table, amount) {
              Ok(entry) -> dict.insert(table, amount, entry)
              Error(Nil) -> table
            }
          },
        )
      case dict.get(table, target) {
        // 동전 목록이 오름차순일 때만 결과도 오름차순이 된다.
        Ok(#(_, used)) -> Ok(used)
        Error(Nil) -> Error(ImpossibleTarget)
      }
    }
  }
}

/// amount를 만드는 가장 적은 조합: 동전 하나 + (amount - 동전)의 최적 조합.
fn best_for(
  coins: List(Int),
  table: Table,
  amount: Int,
) -> Result(#(Int, List(Int)), Nil) {
  list.fold(coins, Error(Nil), fn(best, coin) {
    case dict.get(table, amount - coin), best {
      Error(Nil), _ -> best
      Ok(#(count, _)), Ok(#(best_count, _)) if count + 1 >= best_count -> best
      Ok(#(count, used)), _ -> Ok(#(count + 1, [coin, ..used]))
    }
  })
}
