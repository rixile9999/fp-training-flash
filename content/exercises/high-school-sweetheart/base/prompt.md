고등학교 커플이 SNS에 올릴 이니셜 하트를 만들어 주는 함수 네 개를 작성하세요. 뒤의 함수는 반드시 앞에서 만든 함수를 재사용합니다.

1. `first_letter(name: String) -> String`
   - 이름 앞뒤의 공백·탭·줄바꿈을 걷어낸 뒤 첫 글자를 **대소문자 그대로** 돌려준다.
   - 걷어낸 결과가 빈 문자열이면 `""`를 돌려준다.
2. `initial(name: String) -> String`
   - `first_letter`의 결과를 대문자로 바꾸고 뒤에 `.`을 붙인다.
3. `initials(full_name: String) -> String`
   - 공백 하나로 구분된 이름과 성(예: `"Lance Green"`)을 받아 각각의 `initial`을 공백 하나로 잇는다.
4. `pair(full_name1: String, full_name2: String) -> String`
   - `heart_top <> 첫 사람 initials <> "  +  " <> 둘째 사람 initials <> heart_bottom`을 돌려준다.
   - 하트 모양 문자열 `heart_top`, `heart_bottom`은 시작 코드에 상수로 들어 있다.

```gleam
first_letter("\n  jane ")   // -> "j"
initial("robert")          // -> "R."
initials("Lance Green")    // -> "L. G."
```

`pair("Blake Miller", "Riley Lewis")`의 가운데 줄은 `**     B. M.  +  R. L.     **`가 됩니다.
