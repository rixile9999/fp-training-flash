import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result

pub fn count_ways(coins: List(Int), target: Int) -> Int {
  case target < 0 {
    True -> 0
    False -> {
      // 표: 금액 -> 지금까지 살펴본 동전 종류만으로 만드는 방법 수 (없으면 0)
      let table =
        list.fold(coins, dict.from_list([#(0, 1)]), fn(table, coin) {
          case coin > target {
            // target보다 큰 동전은 어떤 금액에도 쓰이지 않는다.
            True -> table
            // 금액을 올라가며 갱신한 표를 다시 읽으므로 같은 동전을 여러 개 쓸 수 있다.
            False ->
              int.range(
                from: coin,
                to: target + 1,
                with: table,
                run: fn(table, amount) {
                  let total = get(table, amount) + get(table, amount - coin)
                  dict.insert(table, amount, total)
                },
              )
          }
        })
      get(table, target)
    }
  }
}

fn get(table: Dict(Int, Int), amount: Int) -> Int {
  dict.get(table, amount) |> result.unwrap(0)
}
