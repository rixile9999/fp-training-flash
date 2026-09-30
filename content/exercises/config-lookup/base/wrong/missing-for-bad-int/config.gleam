import gleam/dict.{type Dict}
import gleam/int
import gleam/result

pub type ConfigError {
  MissingKey(String)
  NotAnInt(key: String, value: String)
  OutOfRange(key: String, value: Int)
}

pub fn get_int(
  config: Dict(String, String),
  key: String,
) -> Result(Int, ConfigError) {
  dict.get(config, key)
  |> result.try(int.parse)
  |> result.replace_error(MissingKey(key))
}

pub fn get_port(config: Dict(String, String)) -> Result(Int, ConfigError) {
  use port <- result.try(get_int(config, "port"))
  case port >= 1 && port <= 65_535 {
    True -> Ok(port)
    False -> Error(OutOfRange("port", port))
  }
}
