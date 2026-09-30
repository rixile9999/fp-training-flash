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
  use #(key, value) <- result.try(
    string.split_once(line, "=") |> result.replace_error(MissingEquals(line)),
  )
  let number = int.parse(value) |> result.unwrap(0)
  Ok(Setting(key, number))
}
