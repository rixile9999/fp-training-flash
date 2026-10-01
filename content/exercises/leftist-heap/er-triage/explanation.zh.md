整数堆的 merge 用 `x <= y` 来选根。在患者堆中，唯一变化的就是这一次比较，所以把规则抽成一个叫 `goes_first` 的小函数，让 merge 只问这个函数。即使规则改变（例如儿童优先），也只需修改 `goes_first`，而且可以单独测试规则本身。

`goes_first` 先比较病情，只有相同时才看到达序号。如果把它缩成 `a.severity >= b.severity` 这样一行，病情相同的患者之间的顺序就会取决于堆的形状，先到的患者可能被挤到后面。堆不是稳定排序，所以平局处理规则必须写进比较函数里。

merge 中常见的错误是：写好了比较函数，却在 merge 里又用 `p.severity >= q.severity` 比较。单独的比较测试能通过，但整个队列的顺序是错的。`goes_first(p, q)` 为假时，交换参数调用 `merge(b, a)`，就能用同一段代码处理两种情况。节点始终用 `make` 创建，以维持左偏性质（右分支为 O(log n)）（`persistent-data-structures`）。

`treatment_order` 是堆排序：全部放入（`add`），再取出直到为空（`next`）。整体为 O(n log n)。
