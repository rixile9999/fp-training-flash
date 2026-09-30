import gleam/dict
import gleeunit/should
import log_summary.{count_levels}

pub fn empty_lines_test() {
  count_levels([])
  |> should.equal(dict.new())
}

pub fn counts_single_level_test() {
  count_levels(["[INFO] 서버 시작", "[INFO] 요청 처리", "[INFO] 종료"])
  |> should.equal(dict.from_list([#("INFO", 3)]))
}

pub fn counts_several_levels_test() {
  count_levels([
    "[INFO] 서버 시작",
    "[ERROR] 디스크 부족",
    "[WARN] 응답 지연",
    "[INFO] 요청 처리",
  ])
  |> should.equal(dict.from_list([#("INFO", 2), #("ERROR", 1), #("WARN", 1)]))
}

pub fn normalizes_case_test() {
  count_levels(["[warn] 느림", "[Warn] 느림", "[WARN] 느림", "[debug] 값 확인"])
  |> should.equal(dict.from_list([#("WARN", 3), #("DEBUG", 1)]))
}

pub fn skips_malformed_lines_test() {
  count_levels([
    "캐시 초기화",
    "[INFO 닫는 괄호 없음",
    "",
    " [INFO] 앞에 공백",
    "[DEBUG] 정상 줄",
  ])
  |> should.equal(dict.from_list([#("DEBUG", 1)]))
}

pub fn level_without_space_test() {
  count_levels(["[ERROR]디스크 부족", "[ERROR] 재시도 실패"])
  |> should.equal(dict.from_list([#("ERROR", 2)]))
}
