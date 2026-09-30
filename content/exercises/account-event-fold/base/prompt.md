계좌의 현재 상태를 저장하지 않고, 지금까지 일어난 이벤트 목록을 차례로 반영해 계산하려고 합니다. 이벤트 하나를 반영하는 함수와 목록 전체를 반영하는 함수를 작성하세요.

```gleam
pub type Event {
  Deposited(Int)
  Withdrawn(Int)
  Closed
}

pub type Account {
  Account(balance: Int, open: Bool)
}
```

1. `apply_event(account: Account, event: Event) -> Account`
   - `Deposited(n)`: 잔액에 `n`을 더한다.
   - `Withdrawn(n)`: `n`이 잔액 이하이면 뺀다. 잔액보다 크면 계좌를 그대로 둔다.
   - `Closed`: `open`을 `False`로 바꾼다.
   - 이미 해지된(`open == False`) 계좌는 어떤 이벤트가 와도 그대로 둔다.
2. `replay(events: List(Event)) -> Account`
   - `Account(0, True)`에서 시작해 이벤트를 목록 앞에서부터 반영한다.

```gleam
replay([Deposited(100), Withdrawn(30), Withdrawn(500), Closed, Deposited(50)])
// -> Account(balance: 70, open: False)
```
