import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

// 앞에 붙여 모은 뒤 뒤집지 않아서 같은 레벨의 메시지 순서가 거꾸로 된다.
pub fn messages_by_level(lines: List(String)) -> Dict(String, List(String)) {
  list.fold(lines, dict.new(), fn(groups, line) {
    case line {
      "[" <> rest ->
        case string.split_once(rest, "]") {
          Ok(#(level, message)) ->
            dict.upsert(groups, string.uppercase(level), fn(existing) {
              case existing {
                Some(messages) -> [string.trim_start(message), ..messages]
                None -> [string.trim_start(message)]
              }
            })
          Error(Nil) -> groups
        }
      _ -> groups
    }
  })
}
