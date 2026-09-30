배포가 끝나면 배포 중 쌓인 로그를 한 장짜리 요약으로 보여 줍니다. 로그 목록을 받아 요약을 반환하세요.

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

- `total`은 레벨과 상관없이 모든 로그의 수다(`Debug` 포함).
- `warnings`는 `Warn` 로그 수, `criticals`는 `Critical` 로그 수다.
- `first_critical`은 **가장 먼저 나온** `Critical` 로그의 메시지다. `Critical` 로그가 없으면 `None`이다.

```gleam
summarize([
  Entry(Info, "배포 시작"),
  Entry(Critical, "헬스 체크 실패"),
  Entry(Warn, "응답 지연"),
  Entry(Critical, "롤백 시작"),
])
// -> Summary(total: 4, warnings: 1, criticals: 2, first_critical: Some("헬스 체크 실패"))
```
