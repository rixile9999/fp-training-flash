import account.{Account, Closed, Deposited, Withdrawn, apply_event, replay}
import gleeunit/should

pub fn apply_deposit_test() {
  apply_event(Account(100, True), Deposited(50))
  |> should.equal(Account(150, True))
}

pub fn apply_withdraw_test() {
  apply_event(Account(100, True), Withdrawn(100))
  |> should.equal(Account(0, True))
}

pub fn apply_withdraw_insufficient_test() {
  apply_event(Account(100, True), Withdrawn(150))
  |> should.equal(Account(100, True))
}

pub fn apply_after_close_test() {
  apply_event(Account(100, False), Deposited(50))
  |> should.equal(Account(100, False))
}

pub fn replay_test() {
  replay([Deposited(100), Withdrawn(30), Deposited(50)])
  |> should.equal(Account(120, True))
}

pub fn replay_order_matters_test() {
  replay([Withdrawn(50), Deposited(100), Closed, Deposited(10)])
  |> should.equal(Account(100, False))
}

pub fn replay_empty_test() {
  replay([])
  |> should.equal(Account(0, True))
}
