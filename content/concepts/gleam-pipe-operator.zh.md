---
id: gleam-pipe-operator
title: 管道运算符 |>
---
`|>` 把左边的值作为右边函数的**第一个参数**传进去。它把需要由内向外阅读的嵌套调用，
变成从上往下阅读的步骤列表。

| 管道表达式 | 等价写法 |
|---|---|
| `x \|> f` | `f(x)` |
| `x \|> f(a)` | `f(x, a)` |
| `x \|> f(a, _)` | `f(a, x)`（填入捕获 `_` 的位置） |
| `x \|> f \|> g` | `g(f(x))` |

```gleam
import gleam/list
import gleam/string

pub fn normalize(raw: String) -> List(String) {
  raw
  |> string.trim
  |> string.lowercase
  |> string.split(",")
  |> list.map(string.trim)
}
// normalize("  Apple, BANANA ,kiwi ") == ["apple", "banana", "kiwi"]

pub fn greet(name: String) -> String {
  name |> string.append("你好，", _)
}
// greet("小明") == "你好，小明"
```

让每一步的函数只做一种转换，管道本身就成了说明处理顺序的文档。

常见错误：要传的值并不对应函数的第一个参数，却直接用管道传了进去。`name |> string.append("你好，")` 相当于
`string.append(name, "你好，")`，顺序就反了。需要放到其他位置时，用 `_` 指定位置。
