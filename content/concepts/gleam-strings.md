---
id: gleam-strings
title: 문자열 다루기
language: gleam
source: { kind: original }
---
Gleam의 `String`은 UTF-8 문자열이다. 길이와 자르기는 사람이 보는 글자(grapheme) 단위로 센다.

| 함수·문법 | 예 | 결과 |
|---|---|---|
| `<>` | `"주문-" <> int.to_string(42)` | `"주문-42"` |
| `string.length` | `string.length("한글")` | `2` |
| `string.split` / `string.join` | `string.split("a,b", ",")` | `["a", "b"]` |
| `string.split_once` | `string.split_once("k=v", "=")` | `Ok(#("k", "v"))` |
| `string.trim` | `string.trim("  hi ")` | `"hi"` |
| `string.lowercase` / `uppercase` | `string.uppercase("vip")` | `"VIP"` |
| `string.starts_with` / `contains` | `string.starts_with("#sale", "#")` | `True` |
| `string.replace` | `string.replace("a-b", "-", "/")` | `"a/b"` |
| `string.slice(s, 시작, 길이)` | `string.slice("abcdef", 1, 3)` | `"bcd"` |
| `string.pad_start` / `pad_end` | `string.pad_start("7", 3, "0")` | `"007"` |
| `string.to_graphemes` | `string.to_graphemes("가나")` | `["가", "나"]` |
| `int.parse` / `int.to_string` | `int.parse("12")` | `Ok(12)` |
| 접두사 패턴 | `case s { "#" <> rest -> ... }` | 앞부분을 떼고 나머지 사용 |

```gleam
import gleam/int
import gleam/string

pub fn receipt_line(name: String, price: Int) -> String {
  string.pad_end(name, 6, ".") <> string.pad_start(int.to_string(price), 7, " ")
}
// receipt_line("커피", 4500) == "커피....   4500"

pub fn strip_hash(tag: String) -> String {
  case tag {
    "#" <> rest -> rest
    _ -> tag
  }
}
```

흔한 실수: `string.split` 결과에 빈 문자열이 섞일 수 있음을 잊는다. `string.split("a,,b", ",")`은
`["a", "", "b"]`이고, `string.split("", ",")`은 `[]`가 아니라 `[""]`이다. 빈 항목을 버려야 하면 따로 거른다.
