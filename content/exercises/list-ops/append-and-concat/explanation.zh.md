`append(first, second)` 从前往后逐个重建 `first` 的元素，在最末尾把 `second` **原样用作尾部**。因为是不可变列表，`second` 不需要复制，直接共享即可。所以开销只与 `first` 的长度成正比（`cost-model-immutable-structures`）。

了解这个代价模型，`concat` 的方向也就确定了。如果从前往后用 `append(acc, list)` 累积，`acc` 会越来越长，每合并一个列表都要把至今合并的全部内容再复制一遍。有 k 个小列表时，复制量与 1 + 2 + ... + k 成正比，即 O(k^2)，10 万个时会超出时间限制。改为像 `append(list, concat(rest))` 这样**从后往前**合并，每个内层列表恰好复制一次，其余部分都被共享，开销与元素总数成正比。这个形状和用 `foldr` 折叠 `append` 是一样的（`fold-universality`）。

另一个常见错误是为了写成尾递归，像 `append(rest, [x, ..second])` 这样把 `first` 的元素逐个移到 `second` 前面。这样 `first` 部分会被反转，`[1, 2] + [3]` 变成 `[2, 1, 3]`。如果确实需要尾递归，就得先把 `first` 反转再移动。
