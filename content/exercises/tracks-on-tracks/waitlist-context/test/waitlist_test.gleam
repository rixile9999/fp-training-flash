import gleeunit/should
import waitlist.{add_guest, add_vip, next_two, seat_next}

pub fn add_vip_goes_first_test() {
  add_vip(["민지", "도윤"], "서연")
  |> should.equal(["서연", "민지", "도윤"])
}

pub fn add_guest_goes_last_test() {
  add_guest(["민지", "도윤"], "하준")
  |> should.equal(["민지", "도윤", "하준"])
}

pub fn seat_next_removes_first_test() {
  seat_next(["민지", "도윤", "하준"])
  |> should.equal(["도윤", "하준"])
}

pub fn next_two_returns_first_two_test() {
  next_two(["민지", "도윤", "하준"])
  |> should.equal(["민지", "도윤"])
}

pub fn seat_next_on_empty_stays_empty_test() {
  seat_next([])
  |> should.equal([])
}

pub fn next_two_with_one_guest_test() {
  next_two(["민지"])
  |> should.equal(["민지"])
}

pub fn next_two_on_empty_test() {
  next_two([])
  |> should.equal([])
}
