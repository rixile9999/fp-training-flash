Instead of storing an account's current state, you want to compute it by applying the list of events that have happened so far, one after another. Write a function that applies one event and a function that applies the whole list.

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
   - `Deposited(n)`: add `n` to the balance.
   - `Withdrawn(n)`: subtract `n` if it is less than or equal to the balance. If it is larger than the balance, leave the account unchanged.
   - `Closed`: set `open` to `False`.
   - An account that is already closed (`open == False`) stays unchanged whatever event arrives.
2. `replay(events: List(Event)) -> Account`
   - Start from `Account(0, True)` and apply the events from the front of the list.

```gleam
replay([Deposited(100), Withdrawn(30), Withdrawn(500), Closed, Deposited(50)])
// -> Account(balance: 70, open: False)
```
