import gleam/dict.{type Dict}
import gleam/option.{type Option}

pub type ConfigError {
  NotAnInt(key: String, value: String)
}

pub fn get_optional_int(
  config: Dict(String, String),
  key: String,
) -> Result(Option(Int), ConfigError) {
  todo
}

pub fn get_int_or(
  config: Dict(String, String),
  key: String,
  default: Int,
) -> Result(Int, ConfigError) {
  todo
}
