import gleam/dict.{type Dict}
import gleam/order.{type Order}

pub type Match {
  Match(home: String, away: String, home_goals: Int, away_goals: Int)
}

pub type Stats {
  Stats(won: Int, drawn: Int, lost: Int, goals_for: Int, goals_against: Int)
}

pub const header = "Team                 | MP |  W |  D |  L |  GD |  P"

pub fn parse_line(line: String) -> Result(Match, Nil) {
  todo
}

pub fn record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats) {
  todo
}

pub fn compare_rows(a: #(String, Stats), b: #(String, Stats)) -> Order {
  todo
}

pub fn format_row(team: String, stats: Stats) -> String {
  todo
}

pub fn standings(input: String) -> String {
  todo
}
