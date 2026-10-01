同事写的 `exciting_list` 有 bug。请按照规则修复它。

`exciting_list(languages)` 在满足以下任意一条时必须返回 `True`，否则返回 `False`。

- 第一个语言是 `"Gleam"`。（与列表长度无关）
- 第二个语言是 `"Gleam"`，并且列表长度为 2 或 3。

空列表为 `False`。现在的代码至少在两种情况下返回了错误的值。

```gleam
exciting_list(["Gleam"])
// 期望：True
exciting_list(["Elm", "Gleam", "C#", "Scheme"])
// 期望：False
```
