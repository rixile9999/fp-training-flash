미들네임이 있거나 공백이 들쭉날쭉한 이름도 처리하도록 이니셜 기능을 넓히세요. `first_letter`와 `initial`은 시작 코드에 이미 구현되어 있습니다.

1. `name_parts(full_name: String) -> List(String)`
   - 이름을 공백(`" "`) 기준으로 나눈 단어 목록을 원래 순서대로 돌려준다.
   - 앞뒤 공백이나 연속 공백 때문에 생기는 빈 단어(`""`)는 넣지 않는다.
2. `initials(full_name: String) -> String`
   - `name_parts`의 모든 단어에 `initial`을 적용해 공백 하나로 잇는다.
   - 단어가 하나도 없으면 `""`를 돌려준다.
3. `monogram(full_name: String) -> String`
   - `name_parts`의 모든 단어에서 첫 글자를 대문자로 뽑아 공백 없이 붙인다.

```gleam
name_parts("  mary   jane watson ")   // -> ["mary", "jane", "watson"]
initials("  mary   jane watson ")     // -> "M. J. W."
monogram("grace brewster hopper")     // -> "GBH"
```
