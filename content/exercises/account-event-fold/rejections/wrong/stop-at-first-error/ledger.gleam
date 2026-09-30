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

pub fn apply_event(account: Account, event: Event) -> Result(Account, Rejection) {
  case account.open, event {
    False, _ -> Error(AccountClosed)
    True, Deposited(amount) ->
      Ok(Account(..account, balance: account.balance + amount))
    True, Withdrawn(amount) if amount <= account.balance ->
      Ok(Account(..account, balance: account.balance - amount))
    True, Withdrawn(amount) -> Error(InsufficientFunds(amount, account.balance))
    True, Closed -> Ok(Account(..account, open: False))
  }
}

// 첫 거절에서 반영을 멈춘다.
pub fn replay(events: List(Event)) -> #(Account, List(Rejection)) {
  go(events, Account(0, True))
}

fn go(events: List(Event), account: Account) -> #(Account, List(Rejection)) {
  case events {
    [] -> #(account, [])
    [event, ..rest] ->
      case apply_event(account, event) {
        Ok(next) -> go(rest, next)
        Error(reason) -> #(account, [reason])
      }
  }
}
