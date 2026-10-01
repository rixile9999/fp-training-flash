`foldr` 遇到 `[first, ..rest]` 时**先**折叠 `rest`，再把 `first` 和那个结果合并。所以 `function` 第一次被调用的是最后一个元素，用字符串拼接折叠 `"abc"` 会得到 `"cba"`。

这个方向和 `map`、`filter` 正好契合。结果列表从后往前完成，每个元素只需添加到已经完成的尾部**前面**。在前面添加是 O(1)，所以整体是 O(n)，顺序也保持不变。`map` 和 `filter` 都能表示为“从空列表开始、往前添加的 foldr”，这说明 fold 是列表递归的共同骨架（`fold-universality`、`structural-recursion-induction`）。

两个常见错误：

- 用尾递归从前往后累加，以 `[function(x), ..acc]` 往前添加，最后却不反转，结果顺序就会颠倒。使用尾递归时，必须在最后反转一次（`accumulators-and-tail-recursion`）。
- 为了保持顺序而像 `append(acc, [function(x)])` 这样接在累积结果**后面**，结果是对的，但每次都要复制整个累积列表，是 O(n^2)。20 万个元素时会超出时间限制（`cost-model-immutable-structures`）。

在 BEAM 上，即使是 `foldr` 这样的非尾递归，栈也会像堆一样增长，在长列表上不会溢出。所以在本题中，不需要反转的 `foldr` 方式最简单。
