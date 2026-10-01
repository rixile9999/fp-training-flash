不使用 `gleam/list`，亲手实现三个列表操作。

- `foldl(over: list, from: initial, with: function)`：**从列表的第一个元素开始**依次调用 `function(累加值, 元素)`，返回累加得到的最终值。空列表时原样返回 `initial`。
- `length(list)`：返回元素个数。
- `reverse(list)`：返回元素顺序反转后的新列表。
- 有 20 万个元素的列表也必须在时间限制内处理完。不能每处理一个元素就把整个列表重新扫一遍或复制一遍。

```gleam
foldl(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
// -> "abc"
length([1, 2, 3, 4])   // -> 4
reverse([1, 3, 5, 7])  // -> [7, 5, 3, 1]
```
