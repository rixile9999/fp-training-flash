You are changing the data format while migrating a warehouse system. The old system stored, for each shelf, the list of product codes on that shelf. The new system wants to find a shelf location directly from a product code.

Write `index_by_code(shelves)`.

- Input: `Dict(String, List(String))` (shelf name -> list of product codes)
- Output: `Dict(String, String)` (cleaned product code -> shelf name)
- Remove leading and trailing spaces from codes and convert them to uppercase. Leave shelf names as they are.
- Skip codes whose cleaned result is an empty string (`""`, `"   "` and so on).
- You can assume no input has the same code on more than one shelf.

```gleam
index_by_code(dict.from_list([#("A1", [" ab-12", "  "]), #("B2", ["cd-34"])]))
// -> dict.from_list([#("AB-12", "A1"), #("CD-34", "B2")])
```
