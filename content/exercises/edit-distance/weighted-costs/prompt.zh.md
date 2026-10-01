用光学字符识别（OCR）读取扫描的运单时，漏掉字符很常见，但变成完全不相干的字符却很少见。所以地址纠正模块给每种编辑设定不同的代价。求把 `from` 变成 `to` 的最小**代价**。

```gleam
pub type Costs {
  Costs(insert: Int, delete: Int, substitute: Int)
}

pub fn distance_with(from source: String, to target: String, costs costs: Costs) -> Int
```

- **插入**：往 `from` 中加入一个字符。代价为 `costs.insert`。
- **删除**：从 `from` 中去掉一个字符。代价为 `costs.delete`。
- **替换**：把 `from` 的一个字符换成另一个字符。代价为 `costs.substitute`。相同的字符以代价 0 原样保留。
- 代价都是正整数。字符按 grapheme 计数。
- 即使是两个 200 个字符的字符串，也必须在时间限制内完成。

```gleam
distance_with(from: "cat", to: "cut", costs: Costs(insert: 1, delete: 1, substitute: 5))
// -> 2（删除 "a" 的 1 + 插入 "u" 的 1，比替换 "a" 的 5 便宜）
```
