编写四个函数，管理你今后想学的编程语言列表。列表类型是 `List(String)`。

1. `add_language(languages, language)`：返回把新语言添加到**最前面**后的列表。
2. `count_languages(languages)`：返回列表中的语言数量。
3. `reverse_list(languages)`：返回顺序反转后的列表。
4. `exciting_list(languages)`：满足以下任意一条时返回 `True`，否则返回 `False`。
   - 第一个语言是 `"Gleam"`。（与长度无关）
   - 第二个语言是 `"Gleam"`，并且列表长度为 2 或 3。

空列表不是令人兴奋的列表。语言名称必须连大小写都与 `"Gleam"` 完全一致才算。

```gleam
add_language(["OCaml", "Elixir"], "Scheme")
// -> ["Scheme", "OCaml", "Elixir"]

exciting_list(["Lua", "Gleam", "Go"])
// -> True
exciting_list(["Lua", "Gleam", "Go", "Elm"])
// -> False
```
