고객 문의 제목을 비교하기 쉽게 정규화하려 합니다. 작은 함수 두 개를 만들고, 그것을 이어 붙여 `normalize`를 만드세요.

1. `strip_punctuation(text: String) -> String`
   - `.` `,` `!` `?` 네 가지 문자만 모두 지운다. 다른 문자는 그대로 둔다.
2. `collapse_spaces(text: String) -> String`
   - 공백 문자(`" "`)로 나눈 조각 중 빈 조각을 버리고 공백 하나로 다시 잇는다. 그래서 연속 공백은 하나가 되고 앞뒤 공백은 사라진다.
3. `normalize(text: String) -> String`
   - 다음 순서로 적용한다: 앞뒤 공백 제거(`string.trim`, 탭·줄바꿈 포함) → 소문자 변환 → `strip_punctuation` → `collapse_spaces`

```gleam
strip_punctuation("Hi, there! Ok?")   // -> "Hi there Ok"
collapse_spaces("a   b  c")           // -> "a b c"
normalize("  Hello,   World!! ")      // -> "hello world"
```
