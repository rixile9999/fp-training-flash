import gleam/list

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

pub fn replay(events: List(Event)) -> #(Account, List(Rejection)) {
  let #(account, rejections) =
    list.fold(events, #(Account(0, True), []), fn(acc, event) {
      let #(account, rejections) = acc
      case apply_event(account, event) {
        Ok(next) -> #(next, rejections)
        Error(reason) -> #(account, [reason, ..rejections])
      }
    })
  #(account, rejections)
}
