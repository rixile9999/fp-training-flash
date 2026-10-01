---
id: gleam-dict-set
title: Dict 与 Set
---
`Dict(k, v)` 是按键查找值的不可变映射，`Set(a)` 是没有重复元素的集合。所有操作都不会修改原值，
而是返回一个**新的** Dict 或 Set。

| 函数 | 作用 |
|---|---|
| `dict.new()`、`dict.from_list([#(k, v)])` | 创建（同一个键出现多次时取最后一个值） |
| `dict.insert(d, k, v)` | 添加键或覆盖原值 |
| `dict.get(d, k)` | `Ok(v)` 或 `Error(Nil)` |
| `dict.upsert(d, k, fn(Option(v)) -> v)` | 根据已有的值（有则为 `Some`）决定新值 |
| `dict.delete(d, k)`、`dict.has_key(d, k)`、`dict.size(d)` | 删除、检查、计数 |
| `dict.to_list(d)`、`dict.keys(d)`、`dict.fold(d, acc, f)` | 取出内容（不保证顺序） |
| `set.from_list(xs)`、`set.insert(s, x)`、`set.contains(s, x)` | 创建、添加、检查是否包含 |
| `set.union`、`set.intersection`、`set.difference` | 并集、交集、差集 |

```gleam
import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/set

pub fn count_words(words: List(String)) -> Dict(String, Int) {
  list.fold(words, dict.new(), fn(counts, word) {
    dict.upsert(counts, word, fn(existing) {
      case existing {
        Some(n) -> n + 1
        None -> 1
      }
    })
  })
}
// dict.get(count_words(["a", "b", "a"]), "a") == Ok(2)

pub fn tag_count() -> Int {
  set.from_list(["sale", "new", "sale"]) |> set.size   // 2
}
```

常见错误：依赖 `dict.to_list`、`dict.keys`、`set.to_list` 返回的顺序。这个顺序是不确定的，
所以要以列表形式返回结果时，先用 `list.sort` 排序再返回。
