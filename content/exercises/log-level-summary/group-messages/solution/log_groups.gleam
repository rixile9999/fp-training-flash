import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

pub fn messages_by_level(lines: List(String)) -> Dict(String, List(String)) {
  lines
  |> list.fold(dict.new(), fn(groups, line) {
    case parse_line(line) {
      Ok(#(level, message)) ->
        dict.upsert(groups, level, fn(existing) {
          case existing {
            Some(messages) -> [message, ..messages]
            None -> [message]
          }
        })
      Error(Nil) -> groups
    }
  })
  |> dict.map_values(fn(_level, messages) { list.reverse(messages) })
}

fn parse_line(line: String) -> Result(#(String, String), Nil) {
  case line {
    "[" <> rest ->
      case string.split_once(rest, "]") {
        Ok(#(level, message)) ->
          Ok(#(string.uppercase(level), string.trim_start(message)))
        Error(Nil) -> Error(Nil)
      }
    _ -> Error(Nil)
  }
}
