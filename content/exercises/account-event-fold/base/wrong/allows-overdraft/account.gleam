import gleam/list

pub type Event {
  Deposited(Int)
  Withdrawn(Int)
  Closed
}

pub type Account {
  Account(balance: Int, open: Bool)
}

pub fn apply_event(account: Account, event: Event) -> Account {
  case account.open, event {
    False, _ -> account
    True, Deposited(amount) ->
      Account(..account, balance: account.balance + amount)
    True, Withdrawn(amount) ->
      Account(..account, balance: account.balance - amount)
    True, Closed -> Account(..account, open: False)
  }
}

pub fn replay(events: List(Event)) -> Account {
  list.fold(events, Account(balance: 0, open: True), apply_event)
}
