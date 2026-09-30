매장 판매 기록(한 줄에 `카테고리,금액`)을 받아 카테고리별 매출 리포트를 만드는 프로그램을 세 단계 함수로 나눠 작성하세요. 테스트는 각 함수를 따로 호출합니다.

```gleam
pub type Sale {
  Sale(category: String, amount: Int)
}
```

1. `parse_line(line: String) -> Result(Sale, Nil)`
   - 쉼표로 나눈 조각이 정확히 두 개이고 두 번째 조각이 정수이면 `Ok(Sale(..))`, 아니면 `Error(Nil)`.
   - 공백 제거 같은 정리는 하지 않습니다.
2. `total_by_category(sales: List(Sale)) -> List(#(String, Int))`
   - 카테고리별 금액 합계를 카테고리 이름 오름차순으로 돌려준다.
3. `format_row(row: #(String, Int)) -> String`
   - `#("books", 12000)` → `"books: 12000"`
4. `build_report(lines: List(String)) -> List(String)`
   - 위 세 함수를 차례로 연결한다. 파싱에 실패한 줄은 건너뛴다.

```gleam
build_report(["food,3000", "books,12000", "food,x", "books,500"])
// -> ["books: 12500", "food: 3000"]
```
