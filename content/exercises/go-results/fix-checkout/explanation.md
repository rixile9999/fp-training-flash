버그는 `result.unwrap(check_stock(order), order)` 한 줄에 있습니다. `unwrap`은 `Error`를 기본값으로 바꾸므로, 재고 확인이 실패해도 원래 주문을 들고 다음 단계로 넘어갑니다. "재고 부족"이라는 정보가 이 줄에서 사라진 것입니다.

고친 코드는 `use`와 `result.try`로 성공한 경우에만 다음 줄로 진행합니다.

```gleam
use checked <- result.try(check_stock(order))
let discounted = apply_points(checked)
use charged <- result.try(charge(discounted))
Ok(Order(..charged, status: Paid))
```

`use checked <- result.try(r)`는 "`r`이 `Ok(checked)`이면 아래 줄을 계속 실행하고, `Error`면 그 `Error`를 이 함수의 결과로 바로 반환한다"는 뜻입니다. 그래서 코드가 성공 경로만 위에서 아래로 적은 모양이 되고, 실패 처리는 `result.try`가 대신합니다. 포인트 적용은 실패하지 않으므로 평범한 `let`으로 씁니다.

고치면서 흔히 생기는 실수는 세 가지입니다.

- `use _ <- result.try(check_stock(order))`로 성공 여부만 확인하고 다음 단계에는 원래 `order`를 넘기는 것. 재고 확인 단계가 주문을 바꿔서 돌려주면(예: 포장비 추가) 그 변경이 사라집니다. `Ok` 안의 값이 다음 단계의 입력입니다.
- 재고 결과를 따로 받아 두었다가 마지막에 결제 결과와 함께 검사하는 것. 결제가 먼저 검사되면 재고와 결제가 모두 실패했을 때 "카드 승인 거절"이 반환됩니다. 실제로는 재고가 없는데 결제까지 시도한 셈입니다.
- 결제를 먼저 하고 포인트를 나중에 적용하는 것. 단계 순서가 바뀌면 결제 금액이 달라집니다.

베이스 문제의 바둑 규칙과 같은 구조입니다. 실패할 수 있는 단계를 순서대로 잇고, 첫 실패에서 멈춥니다. 이 모양은 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
