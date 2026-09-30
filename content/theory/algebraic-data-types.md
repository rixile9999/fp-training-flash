---
id: algebraic-data-types
title: 합 타입과 빠짐없는 분기
level: basic
relatedSkills: [data-transformation, explicit-failure]
furtherReading: []
---
타입은 값들을 조합하는 두 가지 방법으로 만들어진다.

- **곱 타입**: 여러 값을 **모두** 가진다. `Order(id: Int, status: Status, amount: Int)`는 세 필드를 동시에 가진다.
- **합 타입**: 여러 경우 중 **정확히 하나**다. `Status`는 `Pending`, `Shipped`, `Cancelled` 중 하나다.

둘을 조합한 타입을 대수적 데이터 타입이라 한다. 가능한 값의 개수를 세어 보면 이름의 이유가 보인다. 곱 타입은 각 필드 경우의 수를 곱하고, 합 타입은 더한다.

```gleam
pub type Status {
  Pending
  Shipped
  Cancelled
}

fn label(status: Status) -> String {
  case status {
    Pending -> "배송 대기"
    Shipped -> "배송 완료"
    Cancelled -> "취소"
  }
}
```

Gleam 컴파일러는 `case`가 합 타입의 모든 경우를 다뤘는지 검사한다. 새 상태가 추가되면 빠진 분기를 컴파일 오류로 알려준다. `_ ->`로 나머지를 한꺼번에 받으면 이 검사를 스스로 끄는 셈이다.

## 이 개념이 쓰이는 곳

- 상태에 따라 처리를 나눌 때 `case`로 모든 경우를 명시한다.
- `Option(a)`과 `Result(a, e)`도 합 타입이다. 실패를 타입으로 표현하는 기반이 된다.
