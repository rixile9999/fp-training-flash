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
  list.fold(entries, Summary(0, 0, 0, None), add_entry)
}

fn add_entry(summary: Summary, entry: Entry) -> Summary {
  let summary = Summary(..summary, total: summary.total + 1)
  case entry.level {
    Debug | Info -> summary
    Warn -> Summary(..summary, warnings: summary.warnings + 1)
    Critical ->
      Summary(
        ..summary,
        criticals: summary.criticals + 1,
        first_critical: option.or(summary.first_critical, Some(entry.message)),
      )
  }
}
