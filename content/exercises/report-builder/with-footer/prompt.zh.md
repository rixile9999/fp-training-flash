想在按类别统计的销售报表末尾加上总合计和跳过的行数。`parse_line`、`total_by_category`、`format_row` 已经写好了（`parse_line`：`"books,100"` → `Ok(Sale("books", 100))`，`format_row(#("books", 100))` → `"books: 100"`）。请编写下面三个函数。

1. `parse_all(lines: List(String)) -> #(List(Sale), Int)`
   - **按输入顺序**收集解析成功的记录，并统计解析失败的行数。
   - 忽略内容为空字符串 `""` 的行。它既不进入记录，也不计入失败数。
2. `footer(sales: List(Sale), skipped: Int) -> List(String)`
   - 返回两行：`["total: <所有金额之和>", "skipped: <skipped>"]`。
3. `build_report(lines: List(String)) -> List(String)`
   - 在按类别的行（名称升序）之后接上 `footer` 的两行。

```gleam
build_report(["food,3000", "", "books,12000", "oops"])
// -> ["books: 12000", "food: 3000", "total: 15000", "skipped: 1"]
```
