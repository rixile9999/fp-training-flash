搜索框的错别字纠正用**编辑距离**来衡量两个词有多相似。求把 `from` 变成 `to` 所需的最少编辑次数。

```gleam
pub fn distance(from source: String, to target: String) -> Int
```

- 编辑有三种，每种各算 1 次：**插入**一个字符、**删除**一个字符、把一个字符**替换**成另一个字符。
- 字符按 grapheme 计数。一个韩文字符也算一个字符。
- 如果一方是空字符串，距离就是另一方的字符数。
- 即使是两个 300 个字符的字符串，也必须在时间限制内完成。

```gleam
distance(from: "parcel", to: "pencil")
// -> 3（a→e、r→n、e→i 三次替换）
```
