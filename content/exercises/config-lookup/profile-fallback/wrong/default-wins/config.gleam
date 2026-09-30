import gleam/dict.{type Dict}
import gleam/int
import gleam/result

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
  use settings <- result.try(
    dict.get(profiles, profile)
    |> result.replace_error(UnknownProfile(profile)),
  )
  from_default(profiles, key)
  |> result.lazy_or(fn() { dict.get(settings, key) })
  |> result.replace_error(MissingKey(key))
}

fn from_default(
  profiles: Dict(String, Dict(String, String)),
  key: String,
) -> Result(String, Nil) {
  use defaults <- result.try(dict.get(profiles, "default"))
  dict.get(defaults, key)
}

pub fn resolve_int(
  profiles: Dict(String, Dict(String, String)),
  profile: String,
  key: String,
) -> Result(Int, ConfigError) {
  use value <- result.try(resolve(profiles, profile, key))
  int.parse(value) |> result.replace_error(NotAnInt(key, value))
}
