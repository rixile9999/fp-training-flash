import gleam/list

/// 목록의 각 원소에 fun을 적용한 새 목록. 순서는 입력과 같아야 한다.
pub fn accumulate(items: List(a), fun: fn(a) -> b) -> List(b) {
  go(items, fun, [])
}

fn go(items: List(a), fun: fn(a) -> b, acc: List(b)) -> List(b) {
  case items {
    [] -> acc
    [first, ..rest] -> go(rest, fun, [fun(first), ..acc])
  }
}

/// 세전 가격마다 부가세 10%를 더한 가격. 1원 미만은 버린다.
pub fn with_vat(prices: List(Int)) -> List(Int) {
  accumulate(prices, fn(price) { price * 110 / 100 })
  |> list.reverse
}
