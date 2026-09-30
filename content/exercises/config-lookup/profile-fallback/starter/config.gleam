import gleam/dict.{type Dict}

pub type ConfigError {
  UnknownProfile(String)
  MissingKey(String)
  NotAnInt(key: String, value: String)
}

pub fn resolve(
  profiles: Dict(String, Dict(String, String)),
  profile: String,
  key: String,
) -> Result(String, ConfigError) {
  todo
}

pub fn resolve_int(
  profiles: Dict(String, Dict(String, String)),
  profile: String,
  key: String,
) -> Result(Int, ConfigError) {
  todo
}
