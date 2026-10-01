我们不保存账户的当前状态，而是把迄今为止发生的事件列表依次应用来算出它。请编写一个应用单个事件的函数，以及一个应用整个列表的函数。

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
   - `Deposited(n)`：余额加上 `n`。
   - `Withdrawn(n)`：如果 `n` 不超过余额就减去；如果大于余额，账户保持不变。
   - `Closed`：把 `open` 改为 `False`。
   - 已经销户（`open == False`）的账户，无论来什么事件都保持不变。
2. `replay(events: List(Event)) -> Account`
   - 从 `Account(0, True)` 开始，从列表开头依次应用事件。

```gleam
replay([Deposited(100), Withdrawn(30), Withdrawn(500), Closed, Deposited(50)])
// -> Account(balance: 70, open: False)
```
