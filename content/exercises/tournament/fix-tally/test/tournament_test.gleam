import gleam/dict
import gleeunit/should
import tournament.{Draw, Match, Stats, format_row, points, record, tally}

pub fn empty_input_header_only_test() {
  tally("")
  |> should.equal("Team                           | MP |  W |  D |  L |  P")
}

pub fn record_draw_credits_both_test() {
  record(dict.new(), Match("Allegoric Alaskans", "Blithering Badgers", Draw))
  |> should.equal(
    dict.from_list([
      #("Allegoric Alaskans", Stats(won: 0, drawn: 1, lost: 0)),
      #("Blithering Badgers", Stats(won: 0, drawn: 1, lost: 0)),
    ]),
  )
}

pub fn points_test() {
  points(Stats(won: 2, drawn: 1, lost: 3))
  |> should.equal(7)
}

pub fn format_row_test() {
  format_row("Devastating Donkeys", Stats(won: 2, drawn: 1, lost: 0))
  |> should.equal("Devastating Donkeys            |  3 |  2 |  1 |  0 |  7")
}

pub fn sorted_by_points_desc_test() {
  tally("Blithering Badgers;Allegoric Alaskans;win")
  |> should.equal(
    "Team                           | MP |  W |  D |  L |  P
Blithering Badgers             |  1 |  1 |  0 |  0 |  3
Allegoric Alaskans             |  1 |  0 |  0 |  1 |  0",
  )
}

pub fn typical_input_test() {
  tally(
    "Allegoric Alaskans;Blithering Badgers;win
Devastating Donkeys;Courageous Californians;draw
Devastating Donkeys;Allegoric Alaskans;win
Courageous Californians;Blithering Badgers;loss
Blithering Badgers;Devastating Donkeys;loss
Allegoric Alaskans;Courageous Californians;win",
  )
  |> should.equal(
    "Team                           | MP |  W |  D |  L |  P
Devastating Donkeys            |  3 |  2 |  1 |  0 |  7
Allegoric Alaskans             |  3 |  2 |  0 |  1 |  6
Blithering Badgers             |  3 |  1 |  0 |  2 |  3
Courageous Californians        |  3 |  0 |  1 |  2 |  1",
  )
}

pub fn ties_broken_alphabetically_test() {
  tally(
    "Courageous Californians;Devastating Donkeys;win
Allegoric Alaskans;Blithering Badgers;win
Devastating Donkeys;Allegoric Alaskans;loss
Courageous Californians;Blithering Badgers;win
Blithering Badgers;Devastating Donkeys;draw
Allegoric Alaskans;Courageous Californians;draw",
  )
  |> should.equal(
    "Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  3 |  2 |  1 |  0 |  7
Courageous Californians        |  3 |  2 |  1 |  0 |  7
Blithering Badgers             |  3 |  0 |  1 |  2 |  1
Devastating Donkeys            |  3 |  0 |  1 |  2 |  1",
  )
}

pub fn more_than_one_winner_test() {
  tally(
    "Allegoric Alaskans;Blithering Badgers;loss
Allegoric Alaskans;Blithering Badgers;win",
  )
  |> should.equal(
    "Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  2 |  1 |  0 |  1 |  3
Blithering Badgers             |  2 |  1 |  0 |  1 |  3",
  )
}
