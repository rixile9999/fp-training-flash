import gleeunit/should
import triage.{Patient}

pub fn higher_severity_goes_first_test() {
  triage.goes_first(Patient("김", 5, 2), Patient("이", 3, 1))
  |> should.be_true
}

pub fn earlier_arrival_breaks_tie_test() {
  #(
    triage.goes_first(Patient("김", 4, 1), Patient("이", 4, 2)),
    triage.goes_first(Patient("이", 4, 2), Patient("김", 4, 1)),
  )
  |> should.equal(#(True, False))
}

pub fn treatment_order_by_severity_test() {
  triage.treatment_order([
    Patient("김", 2, 1),
    Patient("이", 5, 2),
    Patient("박", 3, 3),
  ])
  |> should.equal(["이", "박", "김"])
}

pub fn empty_waiting_room_test() {
  triage.treatment_order([])
  |> should.equal([])
}

pub fn same_severity_in_arrival_order_test() {
  triage.treatment_order([
    Patient("최", 3, 4),
    Patient("정", 3, 2),
    Patient("강", 3, 3),
    Patient("조", 3, 1),
  ])
  |> should.equal(["조", "정", "강", "최"])
}

pub fn mixed_severity_and_arrival_test() {
  triage.treatment_order([
    Patient("a", 1, 1),
    Patient("b", 4, 2),
    Patient("c", 1, 3),
    Patient("d", 4, 4),
    Patient("e", 2, 5),
    Patient("f", 4, 6),
  ])
  |> should.equal(["b", "d", "f", "e", "a", "c"])
}

pub fn merge_two_waiting_rooms_test() {
  let first = triage.Empty |> triage.add(Patient("김", 2, 1)) |> triage.add(Patient("이", 5, 3))
  let second = triage.Empty |> triage.add(Patient("박", 5, 2))
  let assert Ok(#(p, _)) = triage.next(triage.merge(first, second))
  p.name
  |> should.equal("박")
}
