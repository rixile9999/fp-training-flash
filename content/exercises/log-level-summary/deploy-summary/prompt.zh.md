部署结束后，要把部署过程中积累的日志汇总成一页摘要展示出来。请接收日志列表并返回汇总。

```gleam
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
  Summary(total: Int, warnings: Int, criticals: Int, first_critical: Option(String))
}
```

- `total` 是不分级别的所有日志的数量（包括 `Debug`）。
- `warnings` 是 `Warn` 日志的数量，`criticals` 是 `Critical` 日志的数量。
- `first_critical` 是**最先出现的** `Critical` 日志的消息。没有 `Critical` 日志时为 `None`。

```gleam
summarize([
  Entry(Info, "开始部署"),
  Entry(Critical, "健康检查失败"),
  Entry(Warn, "响应延迟"),
  Entry(Critical, "开始回滚"),
])
// -> Summary(total: 4, warnings: 1, criticals: 2, first_critical: Some("健康检查失败"))
```
