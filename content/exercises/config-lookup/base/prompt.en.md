Server settings are loaded as a `Dict(String, String)`. Implement two functions that read a config value as an integer.

```gleam
pub type ConfigError {
  MissingKey(String)
  NotAnInt(key: String, value: String)
  OutOfRange(key: String, value: Int)
}

pub fn get_int(config: Dict(String, String), key: String) -> Result(Int, ConfigError)
pub fn get_port(config: Dict(String, String)) -> Result(Int, ConfigError)
```

`get_int(config, key)`

- If the key is missing, return `Error(MissingKey(key))`.
- If the value is not an integer, return `Error(NotAnInt(key, value))`. Parse the value as is, without trimming whitespace.

`get_port(config)`

- Read the `"port"` key with `get_int`. If `get_int` fails, return that error unchanged.
- The port must be at least 1 and at most 65535. Otherwise, return `Error(OutOfRange("port", port))`.

```gleam
let config = dict.from_list([#("port", "8080"), #("timeout", "30s")])
get_port(config)             // -> Ok(8080)
get_int(config, "timeout")   // -> Error(NotAnInt("timeout", "30s"))
```
