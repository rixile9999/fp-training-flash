판매 기록(한 줄에 `상품,수량`)으로 상품 판매 순위표를 만드는 코드가 있습니다. 함수는 이미 단계별로 나뉘어 있지만 결과가 틀립니다. 버그를 찾아 고치세요. 함수 이름과 타입은 바꾸지 마세요.

- `parse_line(line)`: `"apple,3"` → `Ok(#("apple", 3))`, 형식이 틀리면 `Error(Nil)` (이미 올바름)
- `total_by_product(rows)`: 상품별 수량 합계 `Dict` (이미 올바름)
- `rank(totals)`: 수량 **내림차순**, 수량이 같으면 상품 이름 **오름차순**
- `format_row(position, row)`: `format_row(1, #("apple", 30))` → `"1. apple (30)"` (이미 올바름)
- `build_ranking(lines)`: 파싱에 실패한 줄은 건너뛰고, 순위 번호는 **1부터** 매긴다

```gleam
build_ranking(["pear,2", "apple,5", "pear,4", "fig,oops"])
// -> ["1. pear (6)", "2. apple (5)"]
```
