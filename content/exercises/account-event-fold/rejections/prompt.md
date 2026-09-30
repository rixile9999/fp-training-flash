계좌 이벤트를 반영할 때 규칙에 어긋나는 이벤트는 거절하고, 무엇이 왜 거절됐는지 기록으로 남기려고 합니다. 기록은 출력하지 않고 값으로 돌려줍니다.

```gleam
pub type Event {
  Deposited(Int)
  Withdrawn(Int)
  Closed
}

pub type Account {
  Account(balance: Int, open: Bool)
}

pub type Rejection {
  InsufficientFunds(requested: Int, balance: Int)
  AccountClosed
}
```

1. `apply_event(account: Account, event: Event) -> Result(Account, Rejection)`
   - 계좌가 해지된 상태(`open == False`)이면 이벤트 종류와 상관없이 `Error(AccountClosed)`.
   - `Deposited(n)`: 잔액에 `n`을 더한다.
   - `Withdrawn(n)`: `n`이 잔액 이하이면 빼고, 아니면 `Error(InsufficientFunds(n, 현재 잔액))`.
   - `Closed`: `open`을 `False`로 바꾼다.
2. `replay(events: List(Event)) -> #(Account, List(Rejection))`
   - `Account(0, True)`에서 시작해 이벤트를 앞에서부터 반영한다.
   - 거절된 이벤트는 계좌를 바꾸지 않고, 사유를 **발생 순서대로** 모은다. 거절 뒤에도 계속 진행한다.

```gleam
replay([Deposited(100), Withdrawn(150), Withdrawn(30), Closed, Deposited(5)])
// -> #(Account(70, False), [InsufficientFunds(150, 100), AccountClosed])
```
