import gleam/dict
import gleam/order
import gleeunit/should
import league_table.{
  Match, Stats, compare_rows, format_row, parse_line, record, standings,
}

pub fn parse_line_test() {
  parse_line("Seoul;Busan;2-1")
  |> should.equal(Ok(Match("Seoul", "Busan", 2, 1)))
}

pub fn record_updates_both_teams_test() {
  record(dict.new(), Match("Seoul", "Busan", 2, 1))
  |> should.equal(
    dict.from_list([
      #("Seoul", Stats(won: 1, drawn: 0, lost: 0, goals_for: 2, goals_against: 1)),
      #("Busan", Stats(won: 0, drawn: 0, lost: 1, goals_for: 1, goals_against: 2)),
    ]),
  )
}

pub fn compare_rows_goal_difference_test() {
  let busan = Stats(won: 1, drawn: 0, lost: 0, goals_for: 1, goals_against: 0)
  let seoul = Stats(won: 1, drawn: 0, lost: 0, goals_for: 3, goals_against: 0)
  compare_rows(#("Busan", busan), #("Seoul", seoul))
  |> should.equal(order.Gt)
}

pub fn compare_rows_name_tiebreak_test() {
  let stats = Stats(won: 1, drawn: 1, lost: 0, goals_for: 3, goals_against: 2)
  compare_rows(#("Daegu", stats), #("Busan", stats))
  |> should.equal(order.Gt)
}

pub fn format_row_signed_goal_difference_test() {
  format_row(
    "Seoul",
    Stats(won: 1, drawn: 1, lost: 0, goals_for: 3, goals_against: 1),
  )
  |> should.equal("Seoul                |  2 |  1 |  1 |  0 |  +2 |  4")
}

pub fn format_row_zero_goal_difference_test() {
  format_row(
    "Busan",
    Stats(won: 0, drawn: 2, lost: 0, goals_for: 1, goals_against: 1),
  )
  |> should.equal("Busan                |  2 |  0 |  2 |  0 |   0 |  2")
}

pub fn standings_test() {
  standings(
    "Seoul;Busan;4-1
Daegu;Incheon;1-0
Busan;Incheon;1-1
Daegu;Seoul;0-1",
  )
  |> should.equal(
    "Team                 | MP |  W |  D |  L |  GD |  P
Seoul                |  2 |  2 |  0 |  0 |  +4 |  6
Daegu                |  2 |  1 |  0 |  1 |   0 |  3
Incheon              |  2 |  0 |  1 |  1 |  -1 |  1
Busan                |  2 |  0 |  1 |  1 |  -3 |  1",
  )
}

pub fn standings_skips_invalid_lines_test() {
  standings(
    "Seoul;Busan;2-1

Daegu;Incheon;3:0
Busan;Seoul;x-1
Incheon;Daegu",
  )
  |> should.equal(
    "Team                 | MP |  W |  D |  L |  GD |  P
Seoul                |  1 |  1 |  0 |  0 |  +1 |  3
Busan                |  1 |  0 |  0 |  1 |  -1 |  0",
  )
}
