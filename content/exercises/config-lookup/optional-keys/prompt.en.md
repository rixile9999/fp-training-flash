Optional settings may be left out, but if they are written, they must be valid. Implement two functions that read optional settings from a config `Dict(String, String)`.

```gleam
pub type ConfigError {
  NotAnInt(key: String, value: String)
}

pub fn get_optional_int(config: Dict(String, String), key: String) -> Result(Option(Int), ConfigError)
pub fn get_int_or(config: Dict(String, String), key: String, default: Int) -> Result(Int, ConfigError)
```

`get_optional_int(config, key)`

- If the key is missing, return `Ok(None)`.
- If the value is an integer, return `Ok(Some(integer))`.
- If the key exists but its value is not an integer, return `Error(NotAnInt(key, value))`. An empty string is also "a value that exists", so it falls into this case. Parse the value as is, without trimming whitespace.

`get_int_or(config, key, default)`

- Return `Ok(default)` only when the key is missing. Everything else behaves like `get_optional_int`.

```gleam
let config = dict.from_list([#("workers", "many")])
get_int_or(config, "timeout", 30)   // -> Ok(30)
get_int_or(config, "workers", 1)    // -> Error(NotAnInt("workers", "many"))
```
