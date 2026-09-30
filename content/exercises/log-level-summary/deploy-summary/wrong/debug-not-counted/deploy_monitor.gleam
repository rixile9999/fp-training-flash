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

// Debug 분기에서 누적값을 그대로 돌려줘 전체 수에서 디버그 로그가 빠진다.
pub fn summarize(entries: List(Entry)) -> Summary {
  list.fold(entries, Summary(0, 0, 0, None), fn(summary, entry) {
    case entry.level {
      Debug -> summary
      Info -> Summary(..summary, total: summary.total + 1)
      Warn ->
        Summary(
          ..summary,
          total: summary.total + 1,
          warnings: summary.warnings + 1,
        )
      Critical ->
        Summary(
          ..summary,
          total: summary.total + 1,
          criticals: summary.criticals + 1,
          first_critical: option.or(summary.first_critical, Some(entry.message)),
        )
    }
  })
}
