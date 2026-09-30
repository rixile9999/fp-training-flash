import gleam/dict.{type Dict}

pub type ConfigError {
  MissingKey(String)
  NotAnInt(key: String, value: String)
  OutOfRange(key: String, value: Int)
}

pub fn get_int(
  config: Dict(String, String),
  key: String,
) -> Result(Int, ConfigError) {
  todo
}

pub fn get_port(config: Dict(String, String)) -> Result(Int, ConfigError) {
  todo
}
