You want to add the overall total and the number of skipped lines to the end of a sales report by category. `parse_line`, `total_by_category` and `format_row` are already done (`parse_line`: `"books,100"` → `Ok(Sale("books", 100))`, `format_row(#("books", 100))` → `"books: 100"`). Write the following three functions.

1. `parse_all(lines: List(String)) -> #(List(Sale), Int)`
   - Collect the records that parse successfully **in input order**, and count the lines that fail to parse.
   - Ignore lines that are the empty string `""`. They go neither into the records nor into the failure count.
2. `footer(sales: List(Sale), skipped: Int) -> List(String)`
   - Returns two lines: `["total: <sum of all amounts>", "skipped: <skipped>"]`.
3. `build_report(lines: List(String)) -> List(String)`
   - Appends the two lines of `footer` after the category rows (in ascending order of name).

```gleam
build_report(["food,3000", "", "books,12000", "oops"])
// -> ["books: 12000", "food: 3000", "total: 15000", "skipped: 1"]
```
