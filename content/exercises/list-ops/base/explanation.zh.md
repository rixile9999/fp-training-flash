三个函数的形状都一样：“从前往后把列表扫一遍，同时累积结果”。所以只要把 `foldl` 写对，其余的只需换上不同的折叠函数（`fold-universality`）。

`foldl` 遇到 `[first, ..rest]` 时，**先**用 `function(initial, first)` 更新累加值，再带着这个值进入 `rest`。递归调用是函数做的最后一件事，所以是尾递归，即使有几十万个元素，栈也不会增长（`accumulators-and-tail-recursion`）。反过来，如果像 `function(foldl(rest...), first)` 这样先折叠剩余部分，就会从最后一个元素开始累加，得到 `"cba"` 而不是 `"abc"`。这是 `foldr` 的行为。

`reverse` 只要从空列表开始，把元素逐个添加到**前面**即可。在前面添加 `[item, ..reversed]` 会原样共享已有列表，所以不管有多少元素都一步完成，整体是 O(n)。

常见错误是像 `append(reverse(rest), [first])` 这样接到末尾。结果是对的，但要在不可变列表末尾添加，就必须整个复制前面的列表，反转 n 个元素需要复制 1 + 2 + ... + n 次，即 O(n^2)。20 万个元素就是约 200 亿次，超出时间限制。不可变列表代价模型的关键在于“在前面添加便宜，接到末尾昂贵”（`cost-model-immutable-structures`）。
