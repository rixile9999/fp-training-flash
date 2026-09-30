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

pub fn apply_event(
  account: Account,
  event: Event,
) -> Result(Account, Rejection) {
  // 잔액 검사를 해지 여부보다 먼저 한다.
  case event {
    Withdrawn(amount) if amount > account.balance ->
      Error(InsufficientFunds(amount, account.balance))
    _ ->
      case account.open, event {
        False, _ -> Error(AccountClosed)
        True, Deposited(amount) ->
          Ok(Account(..account, balance: account.balance + amount))
        True, Withdrawn(amount) ->
          Ok(Account(..account, balance: account.balance - amount))
        True, Closed -> Ok(Account(..account, open: False))
      }
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
  #(account, list.reverse(rejections))
}
