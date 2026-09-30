편의점 재고 목록에서 재입고할 상품을 고릅니다. 거르기 함수 `keep(items, predicate)`는 이미 완성되어 있습니다. 조건 함수를 조립하는 함수와 이를 쓰는 함수를 작성하세요.

```gleam
pub type Product {
  Product(name: String, stock: Int, active: Bool)
}
```

1. `both(p, q)`: 두 조건이 **모두** 참일 때만 참인 새 조건 함수를 반환한다.
2. `negate(p)`: `p`와 반대 결과를 내는 새 조건 함수를 반환한다.
3. `needs_restock(products, threshold)`: 판매 중(`active`가 `True`)이고 재고가 `threshold`보다 **적은**(같으면 제외) 상품을 원래 순서대로 반환한다.
4. `discontinued(products)`: 판매 중지(`active`가 `False`)인 상품을 원래 순서대로 반환한다.

`needs_restock`과 `discontinued`는 `keep`과 위의 두 함수를 써서 만드세요. `list.filter`는 쓰지 않습니다.

```gleam
needs_restock([Product("우유", 2, True), Product("빵", 30, True), Product("두유", 0, False)], 5)
// -> [Product("우유", 2, True)]
```
