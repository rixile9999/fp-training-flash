import gleam/int
import gleam/result
import gleam/string

pub type Setting {
  Setting(key: String, value: Int)
}

pub type SettingError {
  MissingEquals(line: String)
  NotANumber(value: String)
}

pub fn parse_setting(line: String) -> Result(Setting, SettingError) {
  use #(key, value) <- result.try(case string.split(line, "=") {
    [key, value] -> Ok(#(key, value))
    _ -> Error(MissingEquals(line))
  })
  use number <- result.try(
    int.parse(value) |> result.replace_error(NotANumber(value)),
  )
  Ok(Setting(key, number))
}
