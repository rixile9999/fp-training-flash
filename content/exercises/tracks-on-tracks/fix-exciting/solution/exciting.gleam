/// 첫 번째가 "Gleam"이거나, 두 번째가 "Gleam"이고 길이가 2 또는 3이면 True.
pub fn exciting_list(languages: List(String)) -> Bool {
  case languages {
    ["Gleam", ..] -> True
    [_, "Gleam"] | [_, "Gleam", _] -> True
    _ -> False
  }
}
