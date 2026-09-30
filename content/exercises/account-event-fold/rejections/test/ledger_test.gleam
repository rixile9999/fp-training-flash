import gleeunit/should
import ledger.{
  Account, AccountClosed, Closed, Deposited, InsufficientFunds, Withdrawn,
  apply_event, replay,
}

pub fn apply_event_deposit_test() {
  apply_event(Account(100, True), Deposited(50))
  |> should.equal(Ok(Account(150, True)))
}

pub fn apply_event_insufficient_test() {
  apply_event(Account(100, True), Withdrawn(150))
  |> should.equal(Error(InsufficientFunds(requested: 150, balance: 100)))
}

pub fn apply_event_closed_first_test() {
  apply_event(Account(10, False), Withdrawn(50))
  |> should.equal(Error(AccountClosed))
}

pub fn replay_collects_rejections_test() {
  replay([Deposited(100), Withdrawn(150), Withdrawn(30)])
  |> should.equal(#(Account(70, True), [InsufficientFunds(150, 100)]))
}

pub fn replay_continues_after_rejection_test() {
  replay([Withdrawn(10), Deposited(20), Withdrawn(5)])
  |> should.equal(#(Account(15, True), [InsufficientFunds(10, 0)]))
}

pub fn replay_rejections_in_order_test() {
  replay([Withdrawn(10), Deposited(5), Closed, Deposited(1)])
  |> should.equal(
    #(Account(5, False), [InsufficientFunds(10, 0), AccountClosed]),
  )
}
