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
  |> string.trim
  |> string.split(" ")
}

pub fn initials(full_name: String) -> String {
  full_name
  |> name_parts
  |> list.map(initial)
  |> string.join(" ")
}

pub fn monogram(full_name: String) -> String {
  full_name
  |> name_parts
  |> list.map(first_letter)
  |> list.map(string.uppercase)
  |> string.concat
}
