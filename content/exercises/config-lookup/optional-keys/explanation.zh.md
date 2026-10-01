本题的关键在于用不同的值表示“缺失”和“不合法”。返回类型 `Result(Option(Int), ConfigError)` 能容纳全部三种情况。

| 情况 | 值 |
|---|---|
| 写的是整数 | `Ok(Some(n))` |
| 键不存在（可选配置，属于正常） | `Ok(None)` |
| 写了值，但不是整数 | `Error(NotAnInt(key, value))` |

`get_optional_int` 先用 `case` 拆开 `dict.get` 的结果。只有键不存在时才是 `None`；只要键存在，就一定要经过 `int.parse`。`get_int_or` 直接接收这个结果，用 `result.map(option.unwrap(_, default))` **只给 `Ok` 里面的 `None`** 填上默认值。`Error` 不会经过 `result.map`，所以不合法的值始终保持为错误。规则只放在一个地方（`get_optional_int`）并被复用，两个函数的行为就不会出现不一致。

如果把错误的配置换成默认值，程序会悄悄地按另一套配置运行，而运维人员还以为自己写的值正在生效。把失败作为值暴露出来、让调用方做判断，正是理论笔记“错误也是值”（errors-as-values）的要点。

常见错误：

- `dict.get(...) |> result.try(int.parse) |> result.unwrap(default)`。两种失败合并成同一个 `Error(Nil)` 之后，都会变成默认值。
- 用 `option.from_result` 把 `Result` 转成 `Option`。出于同样的原因，不合法的值会变成 `None`。
- 把空字符串当作“缺失”。键存在，就说明有人试图写入一个值。
