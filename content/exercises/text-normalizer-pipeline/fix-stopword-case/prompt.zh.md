图书搜索框中规范化搜索词的代码有一个错误。`normalize_query("The Art of War")` 应该得到 `["art", "war"]`，实际却得到 `["the", "art", "war"]`。请修复 `normalize_query`。

- `split_words(text)`：按空格字符（`" "`）拆分，并丢掉空词。（已经正确）
- `remove_stopwords(words)`：去掉与**小写**停用词 `the`、`a`、`an`、`of` 相同的单词。（已经正确）
- `normalize_query(text)`：把搜索词拆成单词，全部转为小写，去掉停用词后按原来的顺序返回列表。停用词无论大小写都必须去掉。

```gleam
normalize_query("AN Apple a DAY")   // -> ["apple", "day"]
```
