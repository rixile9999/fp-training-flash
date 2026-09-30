import gleam/dict.{type Dict}
import gleam/int
import gleam/option.{type Option, None, Some}
import gleam/result

pub type ConfigError {
  NotAnInt(key: String, value: String)
}

pub fn get_optional_int(
  config: Dict(String, String),
  key: String,
) -> Result(Option(Int), ConfigError) {
  dict.get(config, key)
  |> result.try(int.parse)
  |> option.from_result
  |> Ok
}

pub fn get_int_or(
  config: Dict(String, String),
  key: String,
  default: Int,
) -> Result(Int, ConfigError) {
  get_optional_int(config, key)
  |> result.map(option.unwrap(_, default))
}
