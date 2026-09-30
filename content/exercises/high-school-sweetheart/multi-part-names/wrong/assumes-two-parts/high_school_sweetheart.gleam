import gleam/list
import gleam/result
import gleam/string

pub fn first_letter(name: String) -> String {
  name
  |> string.trim
  |> string.first
  |> result.unwrap("")
}

pub fn initial(name: String) -> String {
  name
  |> first_letter
  |> string.uppercase
  |> string.append(".")
}

pub fn name_parts(full_name: String) -> List(String) {
  full_name
  |> string.split(" ")
  |> list.filter(fn(part) { part != "" })
}

pub fn initials(full_name: String) -> String {
  case name_parts(full_name) {
    [first, last, ..] -> initial(first) <> " " <> initial(last)
    _ -> ""
  }
}

pub fn monogram(full_name: String) -> String {
  case name_parts(full_name) {
    [first, last, ..] ->
      string.uppercase(first_letter(first) <> first_letter(last))
    _ -> ""
  }
}
