原函数在类型上承诺返回 `Result`，实际上却对部分输入无法返回值而崩溃。这样的函数叫作**偏函数**。即使调用方写好了处理 `Error` 的代码，也永远执行不到那里（**全函数与偏函数（total-vs-partial-functions）**主题）。

修改后的代码把两行 `let assert` 在原位置换成 `use ... <- result.try(...)`。

- `string.split_once(line, "=")` 的 `Error(Nil)` 用 `result.replace_error(MissingEquals(line))` 替换，
- `int.parse(value)` 的 `Error(Nil)` 用 `result.replace_error(NotANumber(value))` 替换。

结构不变，只是“失败就崩溃”变成了“失败就返回错误值”。成功路径依然从上往下读（**串联 Result 与单子（monad）**主题）。现在对所有输入都会得到 `Ok` 或 `Error`，服务器可以自行决定怎么做，比如把错误的行收集起来展示，或者只跳过那些行（**错误即值**主题）。

常见错误：

- 为了消除崩溃而使用 `result.unwrap(0)`。程序不再崩溃，但写错的配置会悄悄变成 0。这比崩溃更难发现。
- 把整行放进错误里。`NotANumber` 中只应放出问题的值，这样一眼就能看出该改哪里。
- 用 `string.split(line, "=")` 拆分并只允许两段。`"query=a=b"` 是含有 `=` 的行，所以不是 `MissingEquals`，问题出在值 `"a=b"` 上。
