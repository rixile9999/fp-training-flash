import gleam/list

pub type Event {
  Deposited(Int)
  Withdrawn(Int)
}

pub fn apply_event(balance: Int, event: Event) -> Int {
  case event {
    Deposited(amount) -> balance + amount
    Withdrawn(amount) if amount <= balance -> balance - amount
    Withdrawn(_) -> balance
  }
}

pub fn history(events: List(Event)) -> List(Int) {
  let #(_, balances) =
    list.fold(events, #(0, []), fn(acc, event) {
      let #(balance, balances) = acc
      #(apply_event(balance, event), [balance, ..balances])
    })
  balances
}
