쇼핑몰 결제 처리 함수 `checkout`에 버그가 있습니다. 재고가 없는 상품도 결제가 완료되어 버립니다. 코드를 고치세요.

```gleam
pub type Status {
  Draft
  Paid
}

pub type Order {
  Order(id: Int, amount: Int, status: Status)
}

pub fn checkout(
  order: Order,
  check_stock: fn(Order) -> Result(Order, String),
  apply_points: fn(Order) -> Order,
  charge: fn(Order) -> Result(Order, String),
) -> Result(Order, String)
```

올바른 동작은 다음과 같습니다.

1. `check_stock`으로 재고를 확인한다. 실패하면 그 오류를 그대로 반환하고 이후 단계는 실행하지 않는다.
2. 재고 확인이 돌려준 주문에 `apply_points`로 포인트를 적용한다. 이 단계는 실패하지 않는다.
3. 포인트가 적용된 주문을 `charge`로 결제한다. 실패하면 그 오류를 그대로 반환한다.
4. 모두 성공하면 결제가 돌려준 주문의 `status`를 `Paid`로 바꿔 `Ok`로 반환한다.

```gleam
checkout(Order(1, 10_000, Draft), fn(_) { Error("재고 부족") }, apply_points, charge)
// -> Error("재고 부족")
```
