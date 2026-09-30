앞으로 배우고 싶은 프로그래밍 언어 목록을 관리하는 함수 네 개를 작성하세요. 목록은 `List(String)`입니다.

1. `add_language(languages, language)`: 새 언어를 목록 **맨 앞**에 추가한 목록을 반환한다.
2. `count_languages(languages)`: 목록에 든 언어 수를 반환한다.
3. `reverse_list(languages)`: 순서를 뒤집은 목록을 반환한다.
4. `exciting_list(languages)`: 다음 중 하나이면 `True`, 아니면 `False`를 반환한다.
   - 첫 번째 언어가 `"Gleam"`이다. (길이는 상관없다)
   - 두 번째 언어가 `"Gleam"`이고, 목록 길이가 2 또는 3이다.

빈 목록은 신나는 목록이 아닙니다. 언어 이름은 대소문자까지 정확히 `"Gleam"`일 때만 인정합니다.

```gleam
add_language(["OCaml", "Elixir"], "Scheme")
// -> ["Scheme", "OCaml", "Elixir"]

exciting_list(["Lua", "Gleam", "Go"])
// -> True
exciting_list(["Lua", "Gleam", "Go", "Elm"])
// -> False
```
