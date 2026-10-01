这里有一段代码，用销售记录（每行一条 `商品,数量`）生成商品销售排行表。函数已经按步骤拆分好了，但结果不对。请找出 bug 并修复。不要修改函数名和类型。

- `parse_line(line)`：`"apple,3"` → `Ok(#("apple", 3))`，格式错误时返回 `Error(Nil)`（已经正确）
- `total_by_product(rows)`：每个商品的数量合计 `Dict`（已经正确）
- `rank(totals)`：按数量**降序**，数量相同时按商品名称**升序**
- `format_row(position, row)`：`format_row(1, #("apple", 30))` → `"1. apple (30)"`（已经正确）
- `build_ranking(lines)`：跳过解析失败的行，名次编号**从 1 开始**

```gleam
build_ranking(["pear,2", "apple,5", "pear,4", "fig,oops"])
// -> ["1. pear (6)", "2. apple (5)"]
```
