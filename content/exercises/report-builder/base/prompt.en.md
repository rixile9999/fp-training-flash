Write a program that takes store sales records (one `category,amount` per line) and builds a sales report by category, split into functions for three steps. The tests call each function separately.

```gleam
pub type Sale {
  Sale(category: String, amount: Int)
}
```

1. `parse_line(line: String) -> Result(Sale, Nil)`
   - If splitting on commas gives exactly two pieces and the second piece is an integer, return `Ok(Sale(..))`; otherwise `Error(Nil)`.
   - Do not do any cleanup such as trimming spaces.
2. `total_by_category(sales: List(Sale)) -> List(#(String, Int))`
   - Returns the total amount per category, in ascending order of category name.
3. `format_row(row: #(String, Int)) -> String`
   - `#("books", 12000)` → `"books: 12000"`
4. `build_report(lines: List(String)) -> List(String)`
   - Connects the three functions above in order. Lines that fail to parse are skipped.

```gleam
build_report(["food,3000", "books,12000", "food,x", "books,500"])
// -> ["books: 12500", "food: 3000"]
```
