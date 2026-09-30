---
id: gleam-record-update
title: 레코드 갱신 문법
language: gleam
source: { kind: original }
---
`Order(..order, amount: 9000)`는 `order`에서 `amount`만 바꾼 **새** 레코드를 만든다. 원래 `order`는 바뀌지 않는다.

```gleam
pub type Order {
  Order(id: Int, amount: Int)
}

let a = Order(id: 1, amount: 10_000)
let b = Order(..a, amount: 9000)
// a.amount == 10_000, b.amount == 9000
```

모든 필드를 다시 적는 대신 갱신 문법을 쓰면, 나중에 필드가 추가되어도 코드가 그대로 동작한다.
