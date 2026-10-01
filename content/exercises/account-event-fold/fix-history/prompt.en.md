A bank statement screen should show the "balance after transaction" for each transaction. `history` starts from a balance of 0, applies the events one at a time, and must return **the balance right after each event is applied**, in the same order as the events. But the result is wrong. Fix the bugs. Do not change the function names or types.

- `apply_event(balance, event)`: deposits are added, and only withdrawals less than or equal to the balance are subtracted. A withdrawal larger than the balance leaves the balance unchanged. (Already correct.)
- `history(events)`: records exactly one entry per event. An ignored withdrawal still records the balance at that point.

```gleam
history([Deposited(100), Withdrawn(30), Withdrawn(500), Deposited(50)])
// -> [100, 70, 70, 120]
```
