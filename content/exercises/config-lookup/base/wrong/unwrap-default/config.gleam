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
  use value <- result.try(
    dict.get(config, key) |> result.replace_error(MissingKey(key)),
  )
  int.parse(value) |> result.replace_error(NotAnInt(key, value))
}

pub fn get_port(config: Dict(String, String)) -> Result(Int, ConfigError) {
  let port = get_int(config, "port") |> result.unwrap(0)
  case port >= 1 && port <= 65_535 {
    True -> Ok(port)
    False -> Error(OutOfRange("port", port))
  }
}
