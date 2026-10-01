---
id: gleam-strings
title: Working with strings
---
A Gleam `String` is a UTF-8 string. Length and slicing count in user-perceived characters (graphemes).

| Function / syntax | Example | Result |
|---|---|---|
| `<>` | `"order-" <> int.to_string(42)` | `"order-42"` |
| `string.length` | `string.length("café")` | `4` |
| `string.split` / `string.join` | `string.split("a,b", ",")` | `["a", "b"]` |
| `string.split_once` | `string.split_once("k=v", "=")` | `Ok(#("k", "v"))` |
| `string.trim` | `string.trim("  hi ")` | `"hi"` |
| `string.lowercase` / `uppercase` | `string.uppercase("vip")` | `"VIP"` |
| `string.starts_with` / `contains` | `string.starts_with("#sale", "#")` | `True` |
| `string.replace` | `string.replace("a-b", "-", "/")` | `"a/b"` |
| `string.slice(s, start, length)` | `string.slice("abcdef", 1, 3)` | `"bcd"` |
| `string.pad_start` / `pad_end` | `string.pad_start("7", 3, "0")` | `"007"` |
| `string.to_graphemes` | `string.to_graphemes("né")` | `["n", "é"]` |
| `int.parse` / `int.to_string` | `int.parse("12")` | `Ok(12)` |
| Prefix pattern | `case s { "#" <> rest -> ... }` | Strips the prefix and uses the rest |

```gleam
import gleam/int
import gleam/string

pub fn receipt_line(name: String, price: Int) -> String {
  string.pad_end(name, 6, ".") <> string.pad_start(int.to_string(price), 7, " ")
}
// receipt_line("Tea", 4500) == "Tea...   4500"

pub fn strip_hash(tag: String) -> String {
  case tag {
    "#" <> rest -> rest
    _ -> tag
  }
}
```

Common mistake: forgetting that the result of `string.split` can contain empty strings. `string.split("a,,b", ",")` is
`["a", "", "b"]`, and `string.split("", ",")` is `[""]`, not `[]`. If you need to drop empty items, filter them out separately.
