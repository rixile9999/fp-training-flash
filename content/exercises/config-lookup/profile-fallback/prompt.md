설정은 프로필별로 나뉘어 있습니다. `profiles`는 프로필 이름에서 그 프로필의 설정(`Dict(String, String)`)으로 가는 사전이고, `"default"` 프로필이 공통값을 가질 수 있습니다. 두 함수를 구현하세요.

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

1. `profile`이 `profiles`에 없으면 `Error(UnknownProfile(profile))`. default에 키가 있어도 대체하지 않는다.
2. 프로필에 키가 있으면 그 값.
3. 없으면 `"default"` 프로필에서 찾는다. `"default"` 프로필 자체가 없으면 빈 설정으로 본다.
4. 그래도 없으면 `Error(MissingKey(key))`.

`resolve_int(profiles, profile, key)`

- `resolve`와 같은 규칙으로 찾은 값을 정수로 바꾼다. 실패하면 `resolve`의 오류를 그대로 반환한다.
- 찾은 값이 정수가 아니면 `Error(NotAnInt(key, 값))`. 이때 default의 값으로 대체하지 않는다.

```gleam
// default: host=localhost, port=5432 / prod: host=db.internal
resolve(profiles, "prod", "host")      // -> Ok("db.internal")
resolve(profiles, "prod", "port")      // -> Ok("5432")
resolve(profiles, "staging", "host")   // -> Error(UnknownProfile("staging"))
```
