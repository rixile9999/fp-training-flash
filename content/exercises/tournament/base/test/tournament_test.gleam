import gleam/dict
import gleam/list
import gleam/string
import gleeunit/should
import tournament.{Match, Stats, Win, format_row, parse_line, record, tally}

pub fn empty_input_header_only_test() {
  tally("")
  |> should.equal("Team                           | MP |  W |  D |  L |  P")
}

pub fn parse_line_test() {
  parse_line("Allegoric Alaskans;Blithering Badgers;win")
  |> should.equal(Ok(Match("Allegoric Alaskans", "Blithering Badgers", Win)))
}

pub fn record_win_test() {
  record(dict.new(), Match("Allegoric Alaskans", "Blithering Badgers", Win))
  |> should.equal(
    dict.from_list([
      #("Allegoric Alaskans", Stats(won: 1, drawn: 0, lost: 0)),
      #("Blithering Badgers", Stats(won: 0, drawn: 0, lost: 1)),
    ]),
  )
}

pub fn format_row_test() {
  format_row("Devastating Donkeys", Stats(won: 2, drawn: 1, lost: 0))
  |> should.equal("Devastating Donkeys            |  3 |  2 |  1 |  0 |  7")
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

pub fn loss_credits_away_team_test() {
  tally("Blithering Badgers;Allegoric Alaskans;loss")
  |> should.equal(
    "Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  1 |  1 |  0 |  0 |  3
Blithering Badgers             |  1 |  0 |  0 |  1 |  0",
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

pub fn skips_invalid_lines_test() {
  tally(
    "Allegoric Alaskans;Blithering Badgers;win

Blithering Badgers;Courageous Californians;tie
Devastating Donkeys;Allegoric Alaskans
Allegoric Alaskans;Blithering Badgers;win;draw",
  )
  |> should.equal(
    "Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  1 |  1 |  0 |  0 |  3
Blithering Badgers             |  1 |  0 |  0 |  1 |  0",
  )
}

pub fn many_teams_tied_sorted_by_name_test() {
  // 팀이 32개를 넘으면 dict.to_list의 순서가 이름순이 아니다.
  let teams = [
    "Zebras", "Yaks", "Wolves", "Vipers", "Unicorns", "Tigers", "Sharks",
    "Rhinos", "Quails", "Pumas", "Owls", "Newts", "Moles", "Lynxes", "Koalas",
    "Jaguars", "Ibises", "Hawks", "Geckos", "Foxes", "Eagles", "Dingoes",
    "Cobras", "Badgers", "Antelopes", "Bisons", "Camels", "Donkeys", "Emus",
    "Falcons", "Gorillas", "Herons", "Iguanas", "Jackals",
  ]
  let input =
    teams
    |> list.sized_chunk(2)
    |> list.map(fn(pair) { string.join(pair, ";") <> ";draw" })
    |> string.join("\n")
  let expected_rows =
    teams
    |> list.sort(string.compare)
    |> list.map(fn(team) {
      string.pad_end(team, to: 30, with: " ") <> " |  1 |  0 |  1 |  0 |  1"
    })
  tally(input)
  |> should.equal(string.join(
    ["Team                           | MP |  W |  D |  L |  P", ..expected_rows],
    "\n",
  ))
}
