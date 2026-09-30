카테고리별 매출 리포트 끝에 전체 합계와 건너뛴 줄 수를 붙이려고 합니다. `parse_line`, `total_by_category`, `format_row`는 이미 완성되어 있습니다(`parse_line`: `"books,100"` → `Ok(Sale("books", 100))`, `format_row(#("books", 100))` → `"books: 100"`). 다음 세 함수를 작성하세요.

1. `parse_all(lines: List(String)) -> #(List(Sale), Int)`
   - 파싱에 성공한 기록을 **입력 순서대로** 모으고, 파싱에 실패한 줄의 수를 센다.
   - 빈 문자열 `""`인 줄은 무시한다. 기록에도, 실패 수에도 들어가지 않는다.
2. `footer(sales: List(Sale), skipped: Int) -> List(String)`
   - `["total: <모든 금액의 합>", "skipped: <skipped>"]` 두 줄을 돌려준다.
3. `build_report(lines: List(String)) -> List(String)`
   - 카테고리별 행(이름 오름차순) 뒤에 `footer`의 두 줄을 붙인다.

```gleam
build_report(["food,3000", "", "books,12000", "oops"])
// -> ["books: 12000", "food: 3000", "total: 15000", "skipped: 1"]
```
