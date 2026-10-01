基于事件的状态管理分为两部分：**单个事件如何改变状态**（`apply_event`），以及 **整个事件列表按什么顺序应用**（`replay`）。`apply_event` 的类型 `fn(Account, Event) -> Account` 与 `list.fold` 接收的函数形状完全一致，所以 `replay` 只需一行：`list.fold(events, Account(0, True), apply_event)`。凡是按顺序遍历列表并更新状态的循环，都可以用一个 fold 来表达（理论主题“fold 的普适性”）。

`apply_event` 是纯函数，结果只由输入决定。同一个事件列表无论重放多少次都得到同一个账户，你也可以用只含一个事件的测试逐条检查规则（理论主题“引用透明性”）。像 `case account.open, event` 这样同时匹配两个值，就能在最前面用一个分支处理“已销户的账户忽略一切”这条规则，其余分支只需考虑未销户的账户。

常见错误如下：

- 用 `list.fold_right` 应用事件，会从后往前处理。取款是否因余额不足被拒绝、存款是否发生在销户之前，都取决于顺序，因此结果会不同。
- 漏掉取款条件，导致余额变成负数。用守卫（`if amount <= account.balance`）把条件写在分支上，就不容易遗漏。
