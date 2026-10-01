`history` carries `#(current balance, history so far)` as the fold's accumulator. The original code had two bugs.

**Bug 1: it recorded the balance before the event.** In `[balance, ..balances]`, `balance` is the value **before** this event is applied, so the history is shifted by one slot. For `[Deposited(100), Withdrawn(30), Deposited(50)]` you get `[0, 100, 70]` instead of `[100, 70, 120]`: the first value is always 0 and the balance after the last transaction is missing. Name the new balance with `let next = apply_event(balance, event)` and use that value for both the state and the history.

**Bug 2: the order is reversed.** Collecting by prepending puts the balance of the last event at the front. Call `list.reverse` once after the fold to restore event order. Prepending and reversing once at the end is O(n), while appending with `list.append` every time is O(n²).

You can also write the same thing as `list.scan(events, 0, apply_event)`. `scan` is "the list of all the intermediate accumulated values of a fold", which matches this problem's definition exactly. As long as the state-transition function `apply_event` is correct, use `fold` when you need the final state and `scan` when you need every intermediate state (theory topic "The universality of fold").

A common mistake is fixing only one of the bugs. Tracing a single-event case and a multi-event case by hand reveals both.
