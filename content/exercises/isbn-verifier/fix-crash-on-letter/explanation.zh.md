原代码中 `char_value` 的返回类型是 `Int`，没有办法表达“转换失败了”。所以它用 `let assert Ok(digit) = int.parse(char)` 忽略了失败，一旦失败程序就会崩溃。`is_valid` 用 `String -> Bool` 这个类型承诺“对所有字符串都给出答案”，实际上却是只对部分输入给出答案的偏函数。

修改后的代码在类型上暴露了失败的可能性。

```gleam
fn char_value(char: String, index: Int) -> Result(Int, Nil) {
  case char, index {
    "X", 9 -> Ok(10)
    _, _ -> int.parse(char)
  }
}
```

在 `is_valid` 中，用 `result.all` 汇总 `list.index_map(chars, char_value)` 得到的 `List(Result(Int, Nil))`。全部是 `Ok` 时得到值列表，只要有一个是 `Error` 就得到 `Error(Nil)`。用 `case` 区分这个结果，在 `Error` 时返回 `False`，失败就不再是崩溃，而是一个普通的答案。

修改时常见的错误有两个。

- 改成 `result.unwrap(int.parse(char), 0)`。程序虽然不会崩溃，但会把错误字符按 0 计算，于是把 `3-598-P1581-X` 这种加权和碰巧对得上的输入判为 `True`。这相当于用错误答案代替了崩溃。
- 重写 `char_value` 时，不管位置如何都把 `X` 当作 10。

只有在能证明“这里绝不会失败”时才使用 `let assert`。像用户输入这样失败本来就会正常发生的地方，要用 `Result` 处理。这一区别在理论笔记“全函数与偏函数”（total-vs-partial-functions）中有更多讨论。
