`normalize` 只是连接四个步骤的管道，真正的规则都在各个步骤函数里。

```gleam
text
|> string.trim
|> string.lowercase
|> strip_punctuation
|> collapse_spaces
```

每个步骤都是“接收字符串、返回字符串”的纯函数，所以可以自由地连接，也可以分别测试。但是**顺序并不自由。**删除标点后，`"Wait , what ?"` 会变成 `"wait  what "`，产生新的连续空格和末尾空格。如果在删除标点之前整理空格，这些空格就会留下来。必须安排好顺序，让后面的步骤清理前面步骤留下的痕迹。

`collapse_spaces` 的关键在于 `string.split(" ")` 会在连续空格之间产生空字符串（`"a  b"` → `["a", "", "b"]`）。如果不用 `list.filter` 丢掉空片段，`string.join` 会把空格原样恢复。

`collapse_spaces` 只处理空格字符 `" "`，所以去不掉制表符和换行符。因此 `normalize` 的第一步先用 `string.trim` 清除首尾所有空白字符。漏掉这一步，`"\tGleam\n"` 就会留成 `"\tgleam\n"`。

`strip_punctuation` 是“展开 → 过滤 → 合并”的形状：变成字符列表，过滤，再合并回去。连用四次 `string.replace` 也可以，但把要删除的字符放在一个列表常量里，规则就集中在一处。用小函数组合出大变换的方法，在理论笔记“函数组合与管道”中有更多讨论。
