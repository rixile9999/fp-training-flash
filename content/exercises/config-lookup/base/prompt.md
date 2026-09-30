서버 설정은 `Dict(String, String)`으로 읽어 들입니다. 설정값을 정수로 꺼내는 두 함수를 구현하세요.

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

- 키가 없으면 `Error(MissingKey(key))`.
- 값이 정수가 아니면 `Error(NotAnInt(key, 값))`. 값은 공백 제거 없이 그대로 해석한다.

`get_port(config)`

- `"port"` 키를 `get_int`으로 읽는다. `get_int`이 실패하면 그 오류를 그대로 반환한다.
- 포트는 1 이상 65535 이하여야 한다. 아니면 `Error(OutOfRange("port", 포트))`.

```gleam
let config = dict.from_list([#("port", "8080"), #("timeout", "30s")])
get_port(config)             // -> Ok(8080)
get_int(config, "timeout")   // -> Error(NotAnInt("timeout", "30s"))
```
