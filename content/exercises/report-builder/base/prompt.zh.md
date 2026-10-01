编写一个程序：接收门店销售记录（每行一条 `类别,金额`），生成按类别统计的销售报表，并把它拆分为三个步骤的函数。测试会分别调用每个函数。

```gleam
pub type Sale {
  Sale(category: String, amount: Int)
}
```

1. `parse_line(line: String) -> Result(Sale, Nil)`
   - 按逗号分割后恰好是两段、且第二段是整数时返回 `Ok(Sale(..))`，否则返回 `Error(Nil)`。
   - 不做去除空格之类的整理。
2. `total_by_category(sales: List(Sale)) -> List(#(String, Int))`
   - 按类别名称升序返回每个类别的金额合计。
3. `format_row(row: #(String, Int)) -> String`
   - `#("books", 12000)` → `"books: 12000"`
4. `build_report(lines: List(String)) -> List(String)`
   - 按顺序连接上面三个函数。解析失败的行跳过。

```gleam
build_report(["food,3000", "books,12000", "food,x", "books,500"])
// -> ["books: 12500", "food: 3000"]
```
