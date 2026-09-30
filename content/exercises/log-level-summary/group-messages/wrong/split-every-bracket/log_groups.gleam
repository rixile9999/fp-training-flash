import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

// "]"로 전부 나눈 뒤 두 번째 조각만 메시지로 써서, 메시지 안의 "]" 뒤가 잘린다.
pub fn messages_by_level(lines: List(String)) -> Dict(String, List(String)) {
  lines
  |> list.fold(dict.new(), fn(groups, line) {
    case line {
      "[" <> rest ->
        case string.split(rest, "]") {
          [level, message, ..] ->
            dict.upsert(groups, string.uppercase(level), fn(existing) {
              case existing {
                Some(messages) -> [string.trim_start(message), ..messages]
                None -> [string.trim_start(message)]
              }
            })
          _ -> groups
        }
      _ -> groups
    }
  })
  |> dict.map_values(fn(_level, messages) { list.reverse(messages) })
}
