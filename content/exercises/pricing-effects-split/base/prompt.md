매장 계산대의 `checkout`은 합계를 계산하는 도중에 `io.println`으로 영수증 줄을 바로 출력합니다. 그래서 영수증 내용을 테스트할 수 없습니다. 계산과 출력을 나누세요. 아래 세 함수는 **아무것도 출력하지 않고** 값만 돌려줍니다.

1. `line_log(item: Item) -> String`
   - `"<name> x<quantity> = <price * quantity>"` 형식의 문자열. 예: `"사과 x3 = 3000"`
2. `quote(items: List(Item)) -> Quote`
   - `total`: 모든 품목의 `price * quantity` 합
   - `log`: 품목마다 `line_log` 결과를 **입력 순서대로** 놓고, 맨 끝에 `"합계 = <total>"` 한 줄을 붙인 목록
   - 품목이 없으면 `Quote(total: 0, log: ["합계 = 0"])`
3. `render(quote: Quote) -> String`
   - `log`의 줄들을 `"\n"`으로 이은 문자열. 마지막 줄 뒤에는 줄바꿈을 붙이지 않는다.

`checkout`은 `quote`와 `render`를 호출해 한 번 출력하고 `total`을 돌려주는 얇은 함수로 바꾸세요(테스트하지 않음).

```gleam
quote([Item("사과", 1000, 3), Item("배", 2500, 2)])
// -> Quote(total: 8000, log: ["사과 x3 = 3000", "배 x2 = 5000", "합계 = 8000"])
```
