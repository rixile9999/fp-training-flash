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

// 치명 로그를 만날 때마다 메시지를 덮어써서 마지막 것이 남는다.
pub fn summarize(entries: List(Entry)) -> Summary {
  list.fold(entries, Summary(0, 0, 0, None), fn(summary, entry) {
    let summary = Summary(..summary, total: summary.total + 1)
    case entry.level {
      Debug | Info -> summary
      Warn -> Summary(..summary, warnings: summary.warnings + 1)
      Critical ->
        Summary(
          ..summary,
          criticals: summary.criticals + 1,
          first_critical: Some(entry.message),
        )
    }
  })
}
