import gleam/list

/// 첫 번째가 "Gleam"이거나, 두 번째가 "Gleam"이고 길이가 2 또는 3이면 True.
pub fn exciting_list(languages: List(String)) -> Bool {
  case languages {
    [] -> False
    [_] -> False
    [first, second, ..] ->
      first == "Gleam" || second == "Gleam" && list.length(languages) >= 2
  }
}
