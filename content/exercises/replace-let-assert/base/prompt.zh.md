`parse_setting` 读取配置文件中的一行 `"键=值"`。它的返回类型是 `Result`，但遇到错误的行时，进程却会在 `let assert` 处崩溃。配置文件里只要有一个错别字，服务器就无法启动。

请去掉 `let assert`，修改为把错误输入以 `SettingError` 值返回。

```gleam
pub type SettingError {
  MissingEquals(line: String)
  NotANumber(value: String)
}
```

- 没有 `=` 时，返回 `Error(MissingEquals(整行))`。
- 以第一个 `=` 为界拆分键和值。值不是整数时，返回 `Error(NotANumber(值))`。空值也不是整数。
- 不去除空白。正确行的结果与现在相同。
- 不使用 `let assert` 和 `panic`。

```gleam
parse_setting("retries=3")      // -> Ok(Setting("retries", 3))
parse_setting("retries=three")  // 现在：崩溃   修复后：Error(NotANumber("three"))
```
