服务器配置以 `Dict(String, String)` 的形式读入。请实现两个把配置值读成整数的函数。

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

- 键不存在时返回 `Error(MissingKey(key))`。
- 值不是整数时返回 `Error(NotAnInt(key, 值))`。值按原样解析，不去除空白。

`get_port(config)`

- 用 `get_int` 读取 `"port"` 键。`get_int` 失败时原样返回该错误。
- 端口必须大于等于 1 且小于等于 65535，否则返回 `Error(OutOfRange("port", 端口))`。

```gleam
let config = dict.from_list([#("port", "8080"), #("timeout", "30s")])
get_port(config)             // -> Ok(8080)
get_int(config, "timeout")   // -> Error(NotAnInt("timeout", "30s"))
```
