import gleeunit/should
import pricing.{Log, Notify, Product, change_price, drop_percent}

pub fn drop_percent_test() {
  drop_percent(10_000, 7550)
  |> should.equal(24)
}

pub fn drop_percent_increase_test() {
  drop_percent(8000, 10_000)
  |> should.equal(0)
}

pub fn change_price_updates_product_test() {
  let #(product, _) = change_price(Product("SKU-1", 10_000), 9000, [])
  product
  |> should.equal(Product("SKU-1", 9000))
}

pub fn change_price_small_drop_logs_only_test() {
  let #(_, effects) = change_price(Product("SKU-1", 10_000), 9000, ["kim"])
  effects
  |> should.equal([Log("SKU-1 가격 변경: 10000 -> 9000")])
}

pub fn change_price_notifies_watchers_test() {
  let #(_, effects) =
    change_price(Product("SKU-1", 10_000), 7500, ["kim", "lee"])
  effects
  |> should.equal([
    Log("SKU-1 가격 변경: 10000 -> 7500"),
    Notify("kim", "SKU-1 가격이 25% 내렸습니다"),
    Notify("lee", "SKU-1 가격이 25% 내렸습니다"),
  ])
}

pub fn change_price_threshold_test() {
  let #(_, effects) = change_price(Product("TEA-9", 5000), 4000, ["park"])
  effects
  |> should.equal([
    Log("TEA-9 가격 변경: 5000 -> 4000"),
    Notify("park", "TEA-9 가격이 20% 내렸습니다"),
  ])
}

pub fn change_price_watcher_order_test() {
  let #(_, effects) =
    change_price(Product("CUP-3", 2000), 1000, ["choi", "ahn", "baek"])
  effects
  |> should.equal([
    Log("CUP-3 가격 변경: 2000 -> 1000"),
    Notify("choi", "CUP-3 가격이 50% 내렸습니다"),
    Notify("ahn", "CUP-3 가격이 50% 내렸습니다"),
    Notify("baek", "CUP-3 가격이 50% 내렸습니다"),
  ])
}
