这里有一个为快递货车挑选货物的函数 `maximum_value`。每件货物都有价值和重量，货车最多只能装到 `maximum_weight`。可是只有一件货物 `Item(value: 10, weight: 3)`、上限为 9 时，它返回 30，相当于把同一件货物装了三次。请修改它，让每件货物最多只装一次。

- 所选货物的总重量不超过 `maximum_weight`，价值总和必须最大。
- 每件货物要么装，要么不装。价值和重量都是正整数。

```gleam
maximum_value([Item(value: 10, weight: 3)], 9)
// 现在：  30
// 期望值：10
```
