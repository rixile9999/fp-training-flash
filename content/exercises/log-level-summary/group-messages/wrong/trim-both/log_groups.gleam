import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

// string.trim으로 앞뒤 공백을 모두 떼서 메시지 끝의 공백까지 사라진다.
pub fn messages_by_level(lines: List(String)) -> Dict(String, List(String)) {
  lines
  |> list.fold(dict.new(), fn(groups, line) {
    case line {
      "[" <> rest ->
        case string.split_once(rest, "]") {
          Ok(#(level, message)) ->
            dict.upsert(groups, string.uppercase(level), fn(existing) {
              case existing {
                Some(messages) -> [string.trim(message), ..messages]
                None -> [string.trim(message)]
              }
            })
          Error(Nil) -> groups
        }
      _ -> groups
    }
  })
  |> dict.map_values(fn(_level, messages) { list.reverse(messages) })
}
