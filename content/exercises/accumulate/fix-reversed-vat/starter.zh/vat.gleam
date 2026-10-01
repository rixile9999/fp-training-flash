/// 对列表的每个元素应用 fun 后得到的新列表。顺序必须与输入相同。
pub fn accumulate(items: List(a), fun: fn(a) -> b) -> List(b) {
  go(items, fun, [])
}

fn go(items: List(a), fun: fn(a) -> b, acc: List(b)) -> List(b) {
  case items {
    [] -> acc
    [first, ..rest] -> go(rest, fun, [fun(first), ..acc])
  }
}

/// 给每个税前价格加上 10% 增值税后的价格。不足 1 韩元的部分舍去。
pub fn with_vat(prices: List(Int)) -> List(Int) {
  accumulate(prices, fn(price) { price * 110 / 100 })
}
