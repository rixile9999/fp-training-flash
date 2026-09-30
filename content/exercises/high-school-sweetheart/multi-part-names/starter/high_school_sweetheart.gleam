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
  todo
}

pub fn initials(full_name: String) -> String {
  todo
}

pub fn monogram(full_name: String) -> String {
  todo
}
