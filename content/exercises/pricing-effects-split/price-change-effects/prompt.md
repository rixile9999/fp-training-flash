상품 가격을 바꾸는 `update_price`는 계산 도중에 변경 기록과 고객 알림을 바로 출력합니다. 누구에게 어떤 알림이 가는지 테스트할 수 있도록, 효과를 **실행하는 대신 값으로 돌려주는** 순수 함수를 만드세요.

```gleam
pub type Effect {
  Log(message: String)
  Notify(customer: String, message: String)
}
```

1. `drop_percent(old_price: Int, new_price: Int) -> Int`
   - `(old_price - new_price) * 100 / old_price` (소수점 아래 버림)
   - 가격이 같거나 오르면, 또는 `old_price`가 0 이하이면 0
2. `change_price(product: Product, new_price: Int, watchers: List(String)) -> #(Product, List(Effect))`
   - 첫 값: 가격만 `new_price`로 바꾼 상품
   - 효과 목록의 첫 원소: `Log("<sku> 가격 변경: <이전 가격> -> <새 가격>")`
   - 인하율이 **20 이상**이면 그 뒤에 `watchers`의 순서대로 고객마다 `Notify(고객, "<sku> 가격이 <인하율>% 내렸습니다")`

`update_price`는 `change_price`를 호출하고 효과를 실행(출력)하는 얇은 함수로 바꾸세요(테스트하지 않음).

```gleam
change_price(Product("SKU-1", 10_000), 7500, ["kim", "lee"])
// -> #(Product("SKU-1", 7500), [
//      Log("SKU-1 가격 변경: 10000 -> 7500"),
//      Notify("kim", "SKU-1 가격이 25% 내렸습니다"),
//      Notify("lee", "SKU-1 가격이 25% 내렸습니다"),
//    ])
```
