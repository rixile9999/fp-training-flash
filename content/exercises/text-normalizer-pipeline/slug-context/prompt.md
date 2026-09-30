상품 상세 페이지 주소에 쓸 슬러그(slug)를 상품명에서 만들려고 합니다. 작은 함수를 차례로 만들고, 뒤 함수는 앞 함수를 재사용하세요.

1. `clean_word(word: String) -> String`
   - 소문자로 바꾼 뒤 영문 소문자 `a`–`z`와 숫자 `0`–`9`만 남긴다. (한글, 기호, 공백 등은 모두 지운다)
2. `to_words(text: String) -> List(String)`
   - 공백 문자(`" "`)로 나눈 각 조각에 `clean_word`를 적용하고, 정리 결과가 빈 문자열인 단어는 버린다. 순서는 유지한다.
3. `slugify(text: String) -> String`
   - `to_words`의 단어들을 `-`로 잇는다.
4. `short_slug(text: String, max_words: Int) -> String`
   - `to_words` 결과의 앞에서부터 최대 `max_words`개만 `-`로 잇는다. 단어가 그보다 적으면 모두 쓴다. `max_words`가 0 이하면 `""`.

```gleam
to_words("Fresh Apples (5kg) - SALE!")       // -> ["fresh", "apples", "5kg", "sale"]
slugify("Fresh Apples (5kg) - SALE!")        // -> "fresh-apples-5kg-sale"
short_slug("Fresh Apples (5kg) - SALE!", 2)  // -> "fresh-apples"
```
