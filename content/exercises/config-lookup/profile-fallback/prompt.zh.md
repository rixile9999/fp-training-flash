配置按配置档（profile）分开存放。`profiles` 是一个从配置档名称映射到该配置档设置（`Dict(String, String)`）的字典，`"default"` 配置档可以存放公共值。请实现两个函数。

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

1. `profile` 不在 `profiles` 中时返回 `Error(UnknownProfile(profile))`。即使 default 中有该键也不回退。
2. 配置档中有该键时返回它的值。
3. 没有时到 `"default"` 配置档中查找。`"default"` 配置档本身不存在时，视为空配置。
4. 仍然找不到时返回 `Error(MissingKey(key))`。

`resolve_int(profiles, profile, key)`

- 把按 `resolve` 的同样规则找到的值转换为整数。`resolve` 失败时原样返回它的错误。
- 找到的值不是整数时返回 `Error(NotAnInt(key, 值))`。这时不要回退到 default 中的值。

```gleam
// default: host=localhost, port=5432 / prod: host=db.internal
resolve(profiles, "prod", "host")      // -> Ok("db.internal")
resolve(profiles, "prod", "port")      // -> Ok("5432")
resolve(profiles, "staging", "host")   // -> Error(UnknownProfile("staging"))
```
