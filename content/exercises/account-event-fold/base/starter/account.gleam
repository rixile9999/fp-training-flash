pub type Event {
  Deposited(Int)
  Withdrawn(Int)
  Closed
}

pub type Account {
  Account(balance: Int, open: Bool)
}

pub fn apply_event(account: Account, event: Event) -> Account {
  todo
}

pub fn replay(events: List(Event)) -> Account {
  todo
}
