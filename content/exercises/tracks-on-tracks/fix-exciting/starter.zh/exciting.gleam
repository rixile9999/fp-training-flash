import gleam/list

/// 第一个是 "Gleam"，或者第二个是 "Gleam" 且长度为 2 或 3 时，返回 True。
pub fn exciting_list(languages: List(String)) -> Bool {
  case languages {
    [] -> False
    [_] -> False
    [first, second, ..] ->
      first == "Gleam" || second == "Gleam" && list.length(languages) >= 2
  }
}
