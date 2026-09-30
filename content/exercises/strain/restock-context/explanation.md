`both`와 `negate`는 조건 함수를 받아 **새 조건 함수**를 돌려주는 함수입니다. 반환하는 익명 함수가 바깥 인자 `p`, `q`를 기억하므로, 나중에 원소를 받았을 때 두 조건을 계산할 수 있습니다.

```gleam
pub fn both(p, q) { fn(item) { p(item) && q(item) } }
pub fn negate(p) { fn(item) { !p(item) } }
```

이렇게 조건을 조립할 수 있으면 거르기 로직(`keep`)은 한 번만 작성하고, 업무 규칙은 조건 조합으로 표현할 수 있습니다.

```gleam
keep(products, both(is_active, fn(product) { product.stock < threshold }))
keep(products, negate(is_active))
```

"어떻게 거르는가"와 "무엇을 거르는가"가 분리되어 규칙이 바뀌어도 `keep`은 그대로입니다. 작은 함수를 값으로 넘기고 조합해 프로그램을 짜는 이 방식은 이론 노트 higher-order-modularity(고차 함수와 모듈성)에서 다룹니다.

흔한 실수는 두 가지입니다.

- `both` 안에서 `||`를 써서 판매 중지 상품까지 재입고 대상에 넣는 것.
- 기준 비교를 `<=`로 적어 재고가 기준과 같은 상품까지 넣는 것. 문제의 "적은"은 미만입니다.
