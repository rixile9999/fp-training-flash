Here is code that builds a product sales ranking table from sales records (one `product,quantity` per line). The functions are already split into steps, but the result is wrong. Find the bugs and fix them. Don't change the function names or types.

- `parse_line(line)`: `"apple,3"` → `Ok(#("apple", 3))`, `Error(Nil)` if the format is wrong (already correct)
- `total_by_product(rows)`: a `Dict` of total quantity per product (already correct)
- `rank(totals)`: by quantity in **descending** order, and by product name in **ascending** order when quantities are equal
- `format_row(position, row)`: `format_row(1, #("apple", 30))` → `"1. apple (30)"` (already correct)
- `build_ranking(lines)`: skip lines that fail to parse, and number the ranks **from 1**

```gleam
build_ranking(["pear,2", "apple,5", "pear,4", "fig,oops"])
// -> ["1. pear (6)", "2. apple (5)"]
```
