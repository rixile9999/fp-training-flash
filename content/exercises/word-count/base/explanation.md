문제를 작은 변환 다섯 개로 나누면 각 단계가 한 가지 일만 합니다.

```gleam
input
|> string.lowercase                  // 1. 대소문자 정규화
|> string.to_graphemes               // 2. 글자 목록으로
|> list.map(fn(g) { case is_word_char(g) { True -> g  False -> " " } })
|> string.concat                     //    구분자를 모두 공백 하나로 통일
|> string.split(" ")                 // 3. 나누기
|> list.filter(fn(word) { word != "" })  // 4. 빈 조각 버리기
|> list.fold(dict.new(), increment)  // 5. 세기
```

- 구분자가 여러 종류(쉼표, 콜론, 줄바꿈 등)라서 `string.split(" ")`만으로는 `"one,two"`를 나누지 못합니다. 모든 구분자를 공백으로 바꾸면 나누기가 한 번으로 끝납니다.
- 구분자가 연속되거나 문자열 앞뒤에 있으면 `split`이 빈 문자열 조각을 만듭니다. 이를 거르지 않으면 `""`가 단어로 세어집니다. 가장 흔한 실수입니다.
- 소문자 변환을 맨 앞에 두면 이후 모든 단계가 소문자만 다루므로 `is_word_char`도 소문자만 확인하면 됩니다.

세기는 목록을 dict 하나로 접는 fold입니다. `increment`에서 `dict.upsert`와 `option.unwrap(previous, 0) + 1`을 쓰면 처음 보는 단어와 이미 본 단어를 한 식으로 처리합니다.

작은 변환을 파이프로 이어 전체를 만드는 방식은 이론 노트 function-composition-pipelines(함수 합성과 파이프라인)에서, 목록을 dict로 접는 방식은 fold-universality(fold의 보편성)에서 다룹니다.
