import gleam/list
import gleam/result
import gleam/string

const heart_top = "
     ******       ******
   **      **   **      **
 **         ** **         **
**            *            **
**                         **
**     "

const heart_bottom = "     **
 **                       **
   **                   **
     **               **
       **           **
         **       **
           **   **
             ***
              *
"

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

pub fn initials(full_name: String) -> String {
  full_name
  |> string.split(" ")
  |> list.map(initial)
  |> string.join(" ")
}

pub fn pair(full_name1: String, full_name2: String) -> String {
  heart_top
  <> initials(full_name1)
  <> "  +  "
  <> initials(full_name2)
  <> heart_bottom
}
