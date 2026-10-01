我们想用商品名生成商品详情页地址中使用的 slug。请依次编写几个小函数，后面的函数要复用前面的函数。

1. `clean_word(word: String) -> String`
   - 转为小写后，只保留英文小写字母 `a`–`z` 和数字 `0`–`9`。（韩文、符号、空格等全部删除）
2. `to_words(text: String) -> List(String)`
   - 对按空格字符（`" "`）拆分得到的每个片段应用 `clean_word`，整理结果为空字符串的单词丢掉。保持顺序。
3. `slugify(text: String) -> String`
   - 用 `-` 连接 `to_words` 得到的单词。
4. `short_slug(text: String, max_words: Int) -> String`
   - 从 `to_words` 结果的前面最多取 `max_words` 个单词，用 `-` 连接。单词比这少时全部使用。`max_words` 小于等于 0 时返回 `""`。

```gleam
to_words("Fresh Apples (5kg) - SALE!")       // -> ["fresh", "apples", "5kg", "sale"]
slugify("Fresh Apples (5kg) - SALE!")        // -> "fresh-apples-5kg-sale"
short_slug("Fresh Apples (5kg) - SALE!", 2)  // -> "fresh-apples"
```
