不使用 `gleam/list`，实现 `foldr`、`map` 和 `filter`。

- `foldr(over: list, from: initial, with: function)`：**从列表的最后一个元素开始**向前依次调用 `function(累加值, 元素)`，返回累加得到的值。空列表时返回 `initial`。
- `map(list, function)`：返回对所有元素应用 `function` 后的列表。保持长度和顺序。
- `filter(list, function)`：只按原有顺序保留 `function(元素)` 为 `True` 的元素。
- 有 20 万个元素的列表也必须在时间限制内处理完。

```gleam
foldr(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
// -> "cba"
map([1, 3, 5, 7], fn(x) { x + 1 })          // -> [2, 4, 6, 8]
filter([1, 2, 3, 5], fn(x) { x % 2 == 1 })  // -> [1, 3, 5]
```
