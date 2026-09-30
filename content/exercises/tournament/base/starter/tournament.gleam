import gleam/dict.{type Dict}

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
  todo
}

pub fn record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats) {
  todo
}

pub fn format_row(team: String, stats: Stats) -> String {
  todo
}

pub fn tally(input: String) -> String {
  todo
}
