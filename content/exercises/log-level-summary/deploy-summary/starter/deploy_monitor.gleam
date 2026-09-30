import gleam/list
import gleam/option.{type Option, None, Some}

pub type Level {
  Debug
  Info
  Warn
  Critical
}

pub type Entry {
  Entry(level: Level, message: String)
}

pub type Summary {
  Summary(
    total: Int,
    warnings: Int,
    criticals: Int,
    first_critical: Option(String),
  )
}

pub fn summarize(entries: List(Entry)) -> Summary {
  todo
}
