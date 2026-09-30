선택 설정은 없어도 되지만, 적혀 있다면 올바른 값이어야 합니다. 설정 `Dict(String, String)`에서 선택 설정을 읽는 두 함수를 구현하세요.

```gleam
pub type ConfigError {
  NotAnInt(key: String, value: String)
}

pub fn get_optional_int(config: Dict(String, String), key: String) -> Result(Option(Int), ConfigError)
pub fn get_int_or(config: Dict(String, String), key: String, default: Int) -> Result(Int, ConfigError)
```

`get_optional_int(config, key)`

- 키가 없으면 `Ok(None)`.
- 값이 정수이면 `Ok(Some(정수))`.
- 키가 있는데 값이 정수가 아니면 `Error(NotAnInt(key, 값))`. 빈 문자열도 "있는 값"이므로 여기에 해당한다. 값은 공백 제거 없이 그대로 해석한다.

`get_int_or(config, key, default)`

- 키가 없을 때만 `Ok(default)`. 나머지는 `get_optional_int`와 같다.

```gleam
let config = dict.from_list([#("workers", "many")])
get_int_or(config, "timeout", 30)   // -> Ok(30)
get_int_or(config, "workers", 1)    // -> Error(NotAnInt("workers", "many"))
```
