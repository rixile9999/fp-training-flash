When a deployment finishes, the logs collected during it are shown as a one-page summary. Take a list of logs and return the summary.

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

- `total` is the number of all logs regardless of level (including `Debug`).
- `warnings` is the number of `Warn` logs, and `criticals` is the number of `Critical` logs.
- `first_critical` is the message of the `Critical` log that **came first**. If there are no `Critical` logs, it is `None`.

```gleam
summarize([
  Entry(Info, "Deployment started"),
  Entry(Critical, "Health check failed"),
  Entry(Warn, "Response delayed"),
  Entry(Critical, "Rollback started"),
])
// -> Summary(total: 4, warnings: 1, criticals: 2, first_critical: Some("Health check failed"))
```
