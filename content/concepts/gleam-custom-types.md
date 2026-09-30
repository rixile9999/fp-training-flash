---
id: gleam-custom-types
title: 커스텀 타입
language: gleam
source: { kind: original }
---
커스텀 타입은 "이 값은 이 모양들 중 **정확히 하나**"라는 사실을 타입으로 적는다. 각 모양(variant)은
생성자이고, 필드를 가질 수 있다.

| 문법 | 예 | 뜻 |
|---|---|---|
| 여러 variant | `type Grade { Basic Vip }` | 둘 중 하나 |
| 레코드 (라벨 필드) | `Customer(name: String, grade: Grade)` | 이름 붙은 필드 묶음 |
| 필드 읽기 | `customer.name` | variant가 하나뿐이거나, 모든 variant에 같은 라벨·타입으로 있는 필드는 `.`으로 읽는다 |
| 패턴으로 꺼내기 | `Points(amount:)` | 필드를 같은 이름의 변수로 꺼낸다 |
| 필드 무시 | `Card(..)` | variant만 확인하고 필드는 무시 |
| 공개 범위 | `pub type`, `pub opaque type` | opaque면 모듈 밖에서 생성자·패턴·필드를 쓸 수 없다 |

```gleam
pub type Payment {
  Card(number: String)
  Cash
  Points(amount: Int)
}

pub fn fee(payment: Payment) -> Int {
  case payment {
    Card(..) -> 300
    Cash -> 0
    Points(amount:) -> amount / 100
  }
}
// fee(Points(1500)) == 15

pub type Grade {
  Basic
  Vip
}

pub type Customer {
  Customer(name: String, grade: Grade)
}

pub fn greeting(customer: Customer) -> String {
  case customer.grade {
    Vip -> customer.name <> " 님, VIP 혜택이 도착했습니다"
    Basic -> customer.name <> " 님, 안녕하세요"
  }
}
// greeting(Customer(name: "민지", grade: Vip)) == "민지 님, VIP 혜택이 도착했습니다"
```

`Bool`이나 `String`으로 상태를 표시하는 대신 variant로 나누면, 불가능한 조합을 아예 만들 수 없고
`case`에서 빠뜨린 경우를 컴파일러가 알려 준다.

흔한 실수: `case`에서 나머지를 `_ ->`로 한데 묶는다. 나중에 variant를 추가해도 컴파일러가 빠진 처리를
알려 주지 못하므로, 가능하면 variant를 하나씩 모두 적는다.
