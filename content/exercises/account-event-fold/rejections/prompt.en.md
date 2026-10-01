When applying account events, you want to reject events that break the rules and keep a record of what was rejected and why. The record is not printed; it is returned as a value.

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
   - If the account is closed (`open == False`), return `Error(AccountClosed)` whatever the event is.
   - `Deposited(n)`: add `n` to the balance.
   - `Withdrawn(n)`: subtract `n` if it is less than or equal to the balance; otherwise return `Error(InsufficientFunds(n, current balance))`.
   - `Closed`: set `open` to `False`.
2. `replay(events: List(Event)) -> #(Account, List(Rejection))`
   - Start from `Account(0, True)` and apply the events from the front.
   - A rejected event does not change the account; collect the reasons **in the order they happen**. Keep going after a rejection.

```gleam
replay([Deposited(100), Withdrawn(150), Withdrawn(30), Closed, Deposited(5)])
// -> #(Account(70, False), [InsufficientFunds(150, 100), AccountClosed])
```
