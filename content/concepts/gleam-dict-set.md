---
id: gleam-dict-set
title: Dict와 Set
language: gleam
source: { kind: original }
---
`Dict(k, v)`는 키로 값을 찾는 불변 맵, `Set(a)`는 중복 없는 값의 모음이다. 모든 연산은 원본을 바꾸지 않고
**새** Dict·Set을 돌려준다.

| 함수 | 하는 일 |
|---|---|
| `dict.new()`, `dict.from_list([#(k, v)])` | 만들기 (같은 키가 여러 번 나오면 마지막 값) |
| `dict.insert(d, k, v)` | 키 추가 또는 덮어쓰기 |
| `dict.get(d, k)` | `Ok(v)` 또는 `Error(Nil)` |
| `dict.upsert(d, k, fn(Option(v)) -> v)` | 기존 값(있으면 `Some`)을 보고 새 값 결정 |
| `dict.delete(d, k)`, `dict.has_key(d, k)`, `dict.size(d)` | 삭제, 확인, 개수 |
| `dict.to_list(d)`, `dict.keys(d)`, `dict.fold(d, acc, f)` | 꺼내기 (순서 보장 없음) |
| `set.from_list(xs)`, `set.insert(s, x)`, `set.contains(s, x)` | 만들기, 추가, 포함 확인 |
| `set.union`, `set.intersection`, `set.difference` | 합집합, 교집합, 차집합 |

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

흔한 실수: `dict.to_list`, `dict.keys`, `set.to_list`의 순서에 기대는 것. 순서는 정해져 있지 않으므로
결과를 목록으로 돌려줄 때는 `list.sort`로 정렬한 뒤 돌려준다.
