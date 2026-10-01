可选配置可以不写，但只要写了，就必须是正确的值。请实现两个从配置 `Dict(String, String)` 中读取可选配置的函数。

```gleam
pub type ConfigError {
  NotAnInt(key: String, value: String)
}

pub fn get_optional_int(config: Dict(String, String), key: String) -> Result(Option(Int), ConfigError)
pub fn get_int_or(config: Dict(String, String), key: String, default: Int) -> Result(Int, ConfigError)
```

`get_optional_int(config, key)`

- 键不存在时返回 `Ok(None)`。
- 值是整数时返回 `Ok(Some(整数))`。
- 键存在但值不是整数时返回 `Error(NotAnInt(key, 值))`。空字符串也算“存在的值”，所以属于这种情况。值按原样解析，不去除空白。

`get_int_or(config, key, default)`

- 只在键不存在时返回 `Ok(default)`，其余情况与 `get_optional_int` 相同。

```gleam
let config = dict.from_list([#("workers", "many")])
get_int_or(config, "timeout", 30)   // -> Ok(30)
get_int_or(config, "workers", 1)    // -> Error(NotAnInt("workers", "many"))
```
