쇼핑몰의 "오늘의 특가"는 상품 하나를 무작위로 골라 할인합니다. 기존 `pick_daily_deal`은 `int.random`을 호출하는 코드와 할인 계산이 한 함수에 섞여 있어서, 결과가 매번 달라 테스트할 수 없습니다. 무작위 선택을 밖으로 밀어내고 계산을 순수 함수로 만드세요.

1. `deal_price(price: Int) -> Int`
   - 30% 할인한 가격(`price * 70 / 100`)을 **100원 단위로 내림**한다.
2. `apply_deal(products: List(Product), index: Int) -> List(Product)`
   - 위치 `index`(0부터 셈)의 상품만 가격을 `deal_price`로 바꾸고, 나머지 상품과 순서는 그대로 둔다.
   - `index`가 음수이거나 목록 길이 이상이면 목록을 그대로 돌려준다.

`pick_daily_deal`은 `int.random`으로 위치를 고른 뒤 `apply_deal`을 호출하는 얇은 함수로 바꾸세요(무작위라서 테스트하지 않음).

```gleam
apply_deal([Product("귤", 10_000), Product("사과", 12_345), Product("배", 5000)], 1)
// -> [Product("귤", 10_000), Product("사과", 8600), Product("배", 5000)]
```
