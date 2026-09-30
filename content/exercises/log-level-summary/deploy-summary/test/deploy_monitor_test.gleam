import deploy_monitor.{
  Critical, Debug, Entry, Info, Summary, Warn, summarize,
}
import gleam/option.{None, Some}
import gleeunit/should

pub fn empty_entries_test() {
  summarize([])
  |> should.equal(Summary(0, 0, 0, None))
}

pub fn counts_by_level_test() {
  summarize([
    Entry(Info, "배포 시작"),
    Entry(Warn, "응답 지연"),
    Entry(Debug, "설정 로드"),
    Entry(Warn, "재시도"),
    Entry(Info, "배포 완료"),
  ])
  |> should.equal(Summary(5, 2, 0, None))
}

pub fn records_critical_message_test() {
  summarize([Entry(Info, "배포 시작"), Entry(Critical, "헬스 체크 실패")])
  |> should.equal(Summary(2, 0, 1, Some("헬스 체크 실패")))
}

pub fn keeps_first_critical_test() {
  summarize([
    Entry(Critical, "DB 연결 끊김"),
    Entry(Warn, "응답 지연"),
    Entry(Critical, "롤백 시작"),
    Entry(Critical, "롤백 실패"),
  ])
  |> should.equal(Summary(4, 1, 3, Some("DB 연결 끊김")))
}

pub fn total_includes_debug_test() {
  summarize([Entry(Debug, "a"), Entry(Debug, "b"), Entry(Debug, "c")])
  |> should.equal(Summary(3, 0, 0, None))
}

pub fn no_critical_is_none_test() {
  summarize([Entry(Warn, "디스크 80%"), Entry(Info, "정리 완료")])
  |> should.equal(Summary(2, 1, 0, None))
}
