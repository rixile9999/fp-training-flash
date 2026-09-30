import balance_history.{Deposited, Withdrawn, apply_event, history}
import gleeunit/should

pub fn apply_event_deposit_test() {
  apply_event(100, Deposited(50))
  |> should.equal(150)
}

pub fn apply_event_rejects_overdraft_test() {
  apply_event(100, Withdrawn(150))
  |> should.equal(100)
}

pub fn history_single_event_test() {
  history([Deposited(100)])
  |> should.equal([100])
}

pub fn history_in_event_order_test() {
  history([Deposited(100), Withdrawn(30), Deposited(50)])
  |> should.equal([100, 70, 120])
}

pub fn history_empty_test() {
  history([])
  |> should.equal([])
}

pub fn history_keeps_balance_on_rejected_test() {
  history([Deposited(50), Withdrawn(80), Deposited(10)])
  |> should.equal([50, 50, 60])
}
