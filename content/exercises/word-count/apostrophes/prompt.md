드라마 영어 자막(ASCII 문자만 사용)에서 단어별 등장 횟수를 셉니다. 자막에는 `don't`, `you're` 같은 축약형과 `'large'`처럼 작은따옴표로 감싼 인용이 섞여 있습니다. 세 함수를 작성하세요.

1. `tokens(text)`: 영문자, 숫자, 작은따옴표(`'`)가 **아닌** 글자를 구분자로 삼아 나눈 조각 목록. 빈 조각은 넣지 않는다. 대소문자는 바꾸지 않는다.
2. `trim_quotes(token)`: 조각의 앞과 뒤에 붙은 작은따옴표를 개수와 상관없이 모두 없앤다. 가운데 작은따옴표는 남긴다.
3. `count_words(input)`: 소문자로 바꾼 뒤 `tokens`로 나누고 `trim_quotes`로 정리해, 단어별 횟수를 `Dict(String, Int)`로 반환한다. 정리한 결과가 빈 문자열이면 단어가 아니다.

글자 하나가 영문자나 숫자인지 판별하는 `is_word_char`는 이미 작성되어 있습니다.

```gleam
tokens("Joe can't,\n'stop'!")
// -> ["Joe", "can't", "'stop'"]
count_words("can, can't, 'can't'")
// -> dict.from_list([#("can", 1), #("can't", 2)])
```
