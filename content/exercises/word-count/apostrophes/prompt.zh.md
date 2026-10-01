要统计英文电视剧字幕（只使用 ASCII 字符）中每个单词出现的次数。字幕中既有 `don't`、`you're` 这样的缩写，也有 `'large'` 这样用单引号括起来的引用。请编写三个函数。

1. `tokens(text)`：以**不是**英文字母、数字或单引号（`'`）的字符为分隔符拆分出的片段列表。不包含空片段。不改变大小写。
2. `trim_quotes(token)`：不管有多少个，都去掉片段首尾附着的所有单引号。中间的单引号保留。
3. `count_words(input)`：先转成小写，再用 `tokens` 拆分、用 `trim_quotes` 整理，以 `Dict(String, Int)` 返回每个单词的次数。整理后如果是空字符串，就不是单词。

判断单个字符是否为英文字母或数字的 `is_word_char` 已经写好了。

```gleam
tokens("Joe can't,\n'stop'!")
// -> ["Joe", "can't", "'stop'"]
count_words("can, can't, 'can't'")
// -> dict.from_list([#("can", 1), #("can't", 2)])
```
