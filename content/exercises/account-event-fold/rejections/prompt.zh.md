在应用账户事件时，我们想拒绝违反规则的事件，并记录下什么被拒绝、为什么被拒绝。记录不打印输出，而是作为值返回。

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
   - 如果账户已销户（`open == False`），无论事件类型如何都返回 `Error(AccountClosed)`。
   - `Deposited(n)`：余额加上 `n`。
   - `Withdrawn(n)`：如果 `n` 不超过余额就减去，否则返回 `Error(InsufficientFunds(n, 当前余额))`。
   - `Closed`：把 `open` 改为 `False`。
2. `replay(events: List(Event)) -> #(Account, List(Rejection))`
   - 从 `Account(0, True)` 开始，从列表开头依次应用事件。
   - 被拒绝的事件不改变账户，原因要 **按发生顺序** 收集。拒绝之后继续执行。

```gleam
replay([Deposited(100), Withdrawn(150), Withdrawn(30), Closed, Deposited(5)])
// -> #(Account(70, False), [InsufficientFunds(150, 100), AccountClosed])
```
