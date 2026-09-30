도서 검색창의 검색어를 정규화하는 코드에 버그가 있습니다. `normalize_query("The Art of War")`는 `["art", "war"]`여야 하는데 `["the", "art", "war"]`가 나옵니다. `normalize_query`를 고치세요.

- `split_words(text)`: 공백 문자(`" "`)로 나누고 빈 단어를 버린다. (이미 올바름)
- `remove_stopwords(words)`: **소문자** 불용어 `the`, `a`, `an`, `of`와 같은 단어를 뺀다. (이미 올바름)
- `normalize_query(text)`: 검색어를 단어로 나누고, 모두 소문자로 바꾸고, 불용어를 뺀 목록을 원래 순서대로 돌려준다. 불용어는 대소문자와 관계없이 빠져야 한다.

```gleam
normalize_query("AN Apple a DAY")   // -> ["apple", "day"]
```
