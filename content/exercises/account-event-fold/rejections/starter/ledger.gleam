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
  todo
}

pub fn replay(events: List(Event)) -> #(Account, List(Rejection)) {
  todo
}
