import gleam/int
import gleam/string

pub type Setting {
  Setting(key: String, value: Int)
}

pub type SettingError {
  MissingEquals(line: String)
  NotANumber(value: String)
}

pub fn parse_setting(line: String) -> Result(Setting, SettingError) {
  let assert Ok(#(key, value)) = string.split_once(line, "=")
  let assert Ok(number) = int.parse(value)
  Ok(Setting(key, number))
}
