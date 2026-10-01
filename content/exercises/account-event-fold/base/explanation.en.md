Event-based state management splits into two parts: **how a single event changes the state** (`apply_event`) and **in what order the whole list of events is applied** (`replay`). The type of `apply_event`, `fn(Account, Event) -> Account`, is exactly the shape of function that `list.fold` takes, so `replay` becomes the one-liner `list.fold(events, Account(0, True), apply_event)`. Any loop that walks a list in order while updating a state can be expressed with a single fold (theory topic "The universality of fold").

`apply_event` is a pure function: its result is determined by its inputs alone. Replaying the same list of events any number of times gives the same account, and you can check the rules one at a time with single-event tests (theory topic "Referential transparency"). Matching two values together, as in `case account.open, event`, lets you handle the rule "a closed account ignores everything" in one branch at the top, so the remaining branches only have to think about open accounts.

Common mistakes:

- Applying the events with `list.fold_right` processes them from the back. Whether a withdrawal is rejected for insufficient funds, or whether a deposit came before the account was closed, depends on the order, so the result changes.
- Forgetting the withdrawal condition, letting the balance go negative. Putting the condition in the branch as a guard (`if amount <= account.balance`) makes it hard to miss.
