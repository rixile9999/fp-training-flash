import gleam/list

pub fn add_language(languages: List(String), language: String) -> List(String) {
  list.append(languages, [language])
}

pub fn count_languages(languages: List(String)) -> Int {
  list.length(languages)
}

pub fn reverse_list(languages: List(String)) -> List(String) {
  list.reverse(languages)
}

pub fn exciting_list(languages: List(String)) -> Bool {
  case languages {
    ["Gleam", ..] -> True
    [_, "Gleam"] | [_, "Gleam", _] -> True
    _ -> False
  }
}
