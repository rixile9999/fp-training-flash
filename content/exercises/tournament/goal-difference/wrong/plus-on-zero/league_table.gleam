import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/option
import gleam/order.{type Order}
import gleam/string

pub type Match {
  Match(home: String, away: String, home_goals: Int, away_goals: Int)
}

pub type Stats {
  Stats(won: Int, drawn: Int, lost: Int, goals_for: Int, goals_against: Int)
}

pub const header = "Team                 | MP |  W |  D |  L |  GD |  P"

pub fn parse_line(line: String) -> Result(Match, Nil) {
  case string.split(line, ";") {
    [home, away, score] ->
      case string.split(score, "-") {
        [home_goals, away_goals] ->
          case int.parse(home_goals), int.parse(away_goals) {
            Ok(h), Ok(a) if h >= 0 && a >= 0 -> Ok(Match(home, away, h, a))
            _, _ -> Error(Nil)
          }
        _ -> Error(Nil)
      }
    _ -> Error(Nil)
  }
}

pub fn record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats) {
  table
  |> dict.upsert(match.home, fn(current) {
    add_game(option.unwrap(current, empty()), match.home_goals, match.away_goals)
  })
  |> dict.upsert(match.away, fn(current) {
    add_game(option.unwrap(current, empty()), match.away_goals, match.home_goals)
  })
}

fn empty() -> Stats {
  Stats(0, 0, 0, 0, 0)
}

fn add_game(stats: Stats, scored: Int, conceded: Int) -> Stats {
  let stats =
    Stats(
      ..stats,
      goals_for: stats.goals_for + scored,
      goals_against: stats.goals_against + conceded,
    )
  case int.compare(scored, conceded) {
    order.Gt -> Stats(..stats, won: stats.won + 1)
    order.Eq -> Stats(..stats, drawn: stats.drawn + 1)
    order.Lt -> Stats(..stats, lost: stats.lost + 1)
  }
}

fn points(stats: Stats) -> Int {
  stats.won * 3 + stats.drawn
}

fn goal_difference(stats: Stats) -> Int {
  stats.goals_for - stats.goals_against
}

pub fn compare_rows(a: #(String, Stats), b: #(String, Stats)) -> Order {
  int.compare(points(b.1), points(a.1))
  |> order.break_tie(int.compare(goal_difference(b.1), goal_difference(a.1)))
  |> order.break_tie(string.compare(a.0, b.0))
}

fn signed(n: Int) -> String {
  case n >= 0 {
    True -> "+" <> int.to_string(n)
    False -> int.to_string(n)
  }
}

pub fn format_row(team: String, stats: Stats) -> String {
  let played = stats.won + stats.drawn + stats.lost
  let pad = fn(text, width) { string.pad_start(text, to: width, with: " ") }
  [
    string.pad_end(team, to: 20, with: " "),
    pad(int.to_string(played), 2),
    pad(int.to_string(stats.won), 2),
    pad(int.to_string(stats.drawn), 2),
    pad(int.to_string(stats.lost), 2),
    pad(signed(goal_difference(stats)), 3),
    pad(int.to_string(points(stats)), 2),
  ]
  |> string.join(" | ")
}

pub fn standings(input: String) -> String {
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
