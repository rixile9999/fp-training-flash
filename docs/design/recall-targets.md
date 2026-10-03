# Recall deck targets (generated 2026-10-03)

Top 50 gleam_stdlib functions by number of calls in the 125 reference solutions (they cover ~95% of calls).
Signatures are from the grader's pinned gleam_stdlib 1.0.5 (modules/coaching/src/reference/gleam/generated/stdlib.json).

| # | function | calls | signature |
|---|---|---|---|
| 1 | `gleam/result.try` | 39 | `result.try(Result(a, b), apply: fn(a) -> Result(c, b)) -> Result(c, b)` |
| 2 | `gleam/list.fold` | 39 | `list.fold(over: List(a), from: b, with: fn(b, a) -> b) -> b` |
| 3 | `gleam/list.map` | 39 | `list.map(List(a), with: fn(a) -> b) -> List(b)` |
| 4 | `gleam/list.reverse` | 32 | `list.reverse(List(a)) -> List(a)` |
| 5 | `gleam/list.filter` | 25 | `list.filter(List(a), keeping: fn(a) -> Bool) -> List(a)` |
| 6 | `gleam/string.split` | 25 | `string.split(String, on: String) -> List(String)` |
| 7 | `gleam/dict.get` | 23 | `dict.get(Dict(a, b), a) -> Result(b, Nil)` |
| 8 | `gleam/dict.new` | 23 | `dict.new() -> Dict(a, b)` |
| 9 | `gleam/dict.upsert` | 21 | `dict.upsert(in: Dict(a, b), update: a, with: fn(option.Option(b)) -> b) -> Dict(a, b)` |
| 10 | `gleam/int.to_string` | 21 | `int.to_string(Int) -> String` |
| 11 | `gleam/int.parse` | 19 | `int.parse(String) -> Result(Int, Nil)` |
| 12 | `gleam/list.length` | 18 | `list.length(of: List(a)) -> Int` |
| 13 | `gleam/result.replace_error` | 15 | `result.replace_error(Result(a, b), c) -> Result(a, c)` |
| 14 | `gleam/dict.insert` | 15 | `dict.insert(into: Dict(a, b), for: a, insert: b) -> Dict(a, b)` |
| 15 | `gleam/result.map` | 14 | `result.map(over: Result(a, b), with: fn(a) -> c) -> Result(c, b)` |
| 16 | `gleam/string.join` | 13 | `string.join(List(String), with: String) -> String` |
| 17 | `gleam/list.index_fold` | 12 | `list.index_fold(over: List(a), from: b, with: fn(b, a, Int) -> b) -> b` |
| 18 | `gleam/list.try_map` | 11 | `list.try_map(over: List(a), with: fn(a) -> Result(b, c)) -> Result(List(b), c)` |
| 19 | `gleam/list.sort` | 11 | `list.sort(List(a), by: fn(a, a) -> order.Order) -> List(a)` |
| 20 | `gleam/list.index_map` | 10 | `list.index_map(List(a), with: fn(a, Int) -> b) -> List(b)` |
| 21 | `gleam/int.range` | 10 | `int.range(from: Int, to: Int, with: a, run: fn(a, Int) -> a) -> a` |
| 22 | `gleam/int.compare` | 9 | `int.compare(Int, with: Int) -> order.Order` |
| 23 | `gleam/string.compare` | 9 | `string.compare(String, String) -> order.Order` |
| 24 | `gleam/list.filter_map` | 9 | `list.filter_map(List(a), with: fn(a) -> Result(b, c)) -> List(b)` |
| 25 | `gleam/result.unwrap` | 9 | `result.unwrap(Result(a, b), or: a) -> a` |
| 26 | `gleam/option.unwrap` | 9 | `option.unwrap(Option(a), or: a) -> a` |
| 27 | `gleam/list.try_fold` | 8 | `list.try_fold(over: List(a), from: b, with: fn(b, a) -> Result(b, c)) -> Result(b, c)` |
| 28 | `gleam/order.break_tie` | 8 | `order.break_tie(in: Order, with: Order) -> Order` |
| 29 | `gleam/int.min` | 8 | `int.min(Int, Int) -> Int` |
| 30 | `gleam/list.append` | 7 | `list.append(List(a), List(a)) -> List(a)` |
| 31 | `gleam/string.to_graphemes` | 7 | `string.to_graphemes(String) -> List(String)` |
| 32 | `gleam/dict.from_list` | 6 | `dict.from_list(List(#(a, b))) -> Dict(a, b)` |
| 33 | `gleam/string.concat` | 6 | `string.concat(List(String)) -> String` |
| 34 | `gleam/dict.fold` | 6 | `dict.fold(over: Dict(a, b), from: c, with: fn(c, a, b) -> c) -> c` |
| 35 | `gleam/string.contains` | 6 | `string.contains(does: String, contain: String) -> Bool` |
| 36 | `gleam/string.length` | 6 | `string.length(String) -> Int` |
| 37 | `gleam/string.uppercase` | 4 | `string.uppercase(String) -> String` |
| 38 | `gleam/string.split_once` | 3 | `string.split_once(String, on: String) -> Result(#(String, String), Nil)` |
| 39 | `gleam/list.flatten` | 3 | `list.flatten(List(List(a))) -> List(a)` |
| 40 | `gleam/string.pad_start` | 3 | `string.pad_start(String, to: Int, with: String) -> String` |
| 41 | `gleam/string.pad_end` | 3 | `string.pad_end(String, to: Int, with: String) -> String` |
| 42 | `gleam/io.println` | 3 | `io.println(String) -> Nil` |
| 43 | `gleam/int.max` | 3 | `int.max(Int, Int) -> Int` |
| 44 | `gleam/set.from_list` | 3 | `set.from_list(List(a)) -> Set(a)` |
| 45 | `gleam/set.contains` | 3 | `set.contains(in: Set(a), this: a) -> Bool` |
| 46 | `gleam/int.absolute_value` | 3 | `int.absolute_value(Int) -> Int` |
| 47 | `gleam/string.append` | 3 | `string.append(to: String, suffix: String) -> String` |
| 48 | `gleam/int.to_float` | 2 | `int.to_float(Int) -> Float` |
| 49 | `gleam/dict.map_values` | 2 | `dict.map_values(in: Dict(a, b), with: fn(a, b) -> c) -> Dict(a, c)` |
| 50 | `gleam/string.slice` | 2 | `string.slice(from: String, at_index: Int, length: Int) -> String` |
