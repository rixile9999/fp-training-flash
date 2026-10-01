import gleam/list

/// True if the first one is "Gleam", or if the second one is "Gleam" and the length is 2 or 3.
pub fn exciting_list(languages: List(String)) -> Bool {
  case languages {
    [] -> False
    [_] -> False
    [first, second, ..] ->
      first == "Gleam" || second == "Gleam" && list.length(languages) >= 2
  }
}
