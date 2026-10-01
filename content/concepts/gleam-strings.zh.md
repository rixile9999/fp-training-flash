---
id: gleam-strings
title: 字符串处理
---
Gleam 的 `String` 是 UTF-8 字符串。长度和截取都以人眼看到的字符（grapheme，字素）为单位计算。

| 函数 / 语法 | 示例 | 结果 |
|---|---|---|
| `<>` | `"订单-" <> int.to_string(42)` | `"订单-42"` |
| `string.length` | `string.length("汉字")` | `2` |
| `string.split` / `string.join` | `string.split("a,b", ",")` | `["a", "b"]` |
| `string.split_once` | `string.split_once("k=v", "=")` | `Ok(#("k", "v"))` |
| `string.trim` | `string.trim("  hi ")` | `"hi"` |
| `string.lowercase` / `uppercase` | `string.uppercase("vip")` | `"VIP"` |
| `string.starts_with` / `contains` | `string.starts_with("#sale", "#")` | `True` |
| `string.replace` | `string.replace("a-b", "-", "/")` | `"a/b"` |
| `string.slice(s, 起始, 长度)` | `string.slice("abcdef", 1, 3)` | `"bcd"` |
| `string.pad_start` / `pad_end` | `string.pad_start("7", 3, "0")` | `"007"` |
| `string.to_graphemes` | `string.to_graphemes("你好")` | `["你", "好"]` |
| `int.parse` / `int.to_string` | `int.parse("12")` | `Ok(12)` |
| 前缀模式 | `case s { "#" <> rest -> ... }` | 去掉前缀，使用剩余部分 |

```gleam
import gleam/int
import gleam/string

pub fn receipt_line(name: String, price: Int) -> String {
  string.pad_end(name, 6, ".") <> string.pad_start(int.to_string(price), 7, " ")
}
// receipt_line("咖啡", 4500) == "咖啡....   4500"

pub fn strip_hash(tag: String) -> String {
  case tag {
    "#" <> rest -> rest
    _ -> tag
  }
}
```

常见错误：忘了 `string.split` 的结果里可能混有空字符串。`string.split("a,,b", ",")` 的结果是
`["a", "", "b"]`，而 `string.split("", ",")` 的结果是 `[""]` 而不是 `[]`。如果需要丢掉空项，要另外过滤。
