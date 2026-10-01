Settings are split by profile. `profiles` is a dictionary from a profile name to that profile's settings (`Dict(String, String)`), and the `"default"` profile can hold shared values. Implement two functions.

```gleam
pub type ConfigError {
  UnknownProfile(String)
  MissingKey(String)
  NotAnInt(key: String, value: String)
}

pub fn resolve(profiles: Dict(String, Dict(String, String)), profile: String, key: String) -> Result(String, ConfigError)
pub fn resolve_int(profiles: Dict(String, Dict(String, String)), profile: String, key: String) -> Result(Int, ConfigError)
```

`resolve(profiles, profile, key)`

1. If `profile` is not in `profiles`, return `Error(UnknownProfile(profile))`. Don't fall back even if default has the key.
2. If the profile has the key, return its value.
3. Otherwise, look in the `"default"` profile. If the `"default"` profile itself doesn't exist, treat it as empty settings.
4. If the key is still not found, return `Error(MissingKey(key))`.

`resolve_int(profiles, profile, key)`

- Convert the value found with the same rules as `resolve` into an integer. If `resolve` fails, return its error unchanged.
- If the value found is not an integer, return `Error(NotAnInt(key, value))`. In that case, don't fall back to the value in default.

```gleam
// default: host=localhost, port=5432 / prod: host=db.internal
resolve(profiles, "prod", "host")      // -> Ok("db.internal")
resolve(profiles, "prod", "port")      // -> Ok("5432")
resolve(profiles, "staging", "host")   // -> Error(UnknownProfile("staging"))
```
