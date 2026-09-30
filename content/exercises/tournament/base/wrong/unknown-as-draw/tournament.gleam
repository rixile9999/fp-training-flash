import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/order
import gleam/string

pub type Outcome {
  Win
  Draw
  Loss
}

pub type Match {
  Match(home: String, away: String, outcome: Outcome)
}

pub type Stats {
  Stats(won: Int, drawn: Int, lost: Int)
}

pub const header = "Team                           | MP |  W |  D |  L |  P"

pub fn parse_line(line: String) -> Result(Match, Nil) {
  case string.split(line, ";") {
    [home, away, "win"] -> Ok(Match(home, away, Win))
    [home, away, "loss"] -> Ok(Match(home, away, Loss))
    [home, away, _] -> Ok(Match(home, away, Draw))
    _ -> Error(Nil)
  }
}

pub fn record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats) {
  let #(home_result, away_result) = case match.outcome {
    Win -> #(Win, Loss)
    Draw -> #(Draw, Draw)
    Loss -> #(Loss, Win)
  }
  table
  |> dict.upsert(match.home, add_result(_, home_result))
  |> dict.upsert(match.away, add_result(_, away_result))
}

fn add_result(stats: Option(Stats), outcome: Outcome) -> Stats {
  let Stats(won, drawn, lost) = option.unwrap(stats, Stats(0, 0, 0))
  case outcome {
    Win -> Stats(won + 1, drawn, lost)
    Draw -> Stats(won, drawn + 1, lost)
    Loss -> Stats(won, drawn, lost + 1)
  }
}

fn points(stats: Stats) -> Int {
  stats.won * 3 + stats.drawn
}

fn compare_rows(a: #(String, Stats), b: #(String, Stats)) -> order.Order {
  int.compare(points(b.1), points(a.1))
  |> order.break_tie(string.compare(a.0, b.0))
}

pub fn format_row(team: String, stats: Stats) -> String {
  let played = stats.won + stats.drawn + stats.lost
  let numbers =
    [played, stats.won, stats.drawn, stats.lost, points(stats)]
    |> list.map(fn(n) { string.pad_start(int.to_string(n), to: 2, with: " ") })
  string.join([string.pad_end(team, to: 30, with: " "), ..numbers], " | ")
}

pub fn tally(input: String) -> String {
  let rows =
    input
    |> string.split("\n")
    |> list.filter_map(parse_line)
    |> list.fold(dict.new(), record)
    |> dict.to_list
    |> list.sort(compare_rows)
    |> list.map(fn(row) { format_row(row.0, row.1) })
  string.join([header, ..rows], "\n")
}
