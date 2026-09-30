import gleam/dict
import gleeunit/should
import log_groups.{messages_by_level}

pub fn empty_lines_test() {
  messages_by_level([])
  |> should.equal(dict.new())
}

pub fn groups_by_level_test() {
  messages_by_level(["[ERROR] 디스크 부족", "[INFO] 재시작 요청"])
  |> should.equal(
    dict.from_list([#("ERROR", ["디스크 부족"]), #("INFO", ["재시작 요청"])]),
  )
}

pub fn keeps_order_within_level_test() {
  messages_by_level([
    "[WARN] 첫째",
    "[INFO] 중간",
    "[WARN] 둘째",
    "[WARN] 셋째",
  ])
  |> should.equal(
    dict.from_list([#("WARN", ["첫째", "둘째", "셋째"]), #("INFO", ["중간"])]),
  )
}

pub fn message_with_bracket_test() {
  messages_by_level(["[DEBUG] items[0] = 3, items[1] = 5"])
  |> should.equal(dict.from_list([#("DEBUG", ["items[0] = 3, items[1] = 5"])]))
}

pub fn normalizes_case_test() {
  messages_by_level(["[error] 가", "[Error] 나"])
  |> should.equal(dict.from_list([#("ERROR", ["가", "나"])]))
}

pub fn skips_malformed_lines_test() {
  messages_by_level(["배포 시작", "[INFO 괄호 없음", "[INFO] 정상"])
  |> should.equal(dict.from_list([#("INFO", ["정상"])]))
}

pub fn keeps_trailing_spaces_test() {
  messages_by_level(["[INFO]  대기열 비움  "])
  |> should.equal(dict.from_list([#("INFO", ["대기열 비움  "])]))
}
