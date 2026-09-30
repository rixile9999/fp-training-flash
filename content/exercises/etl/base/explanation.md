입력의 항목 하나(점수 하나)가 결과에서는 여러 항목(글자 수만큼)으로 펼쳐집니다. 모양이 바뀌는 변환이므로 `dict.map_values` 같은 구조 보존 연산으로는 만들 수 없고, 빈 dict에서 시작해 항목을 하나씩 쌓아 가는 fold가 맞습니다.

```gleam
dict.fold(legacy, dict.new(), fn(result, score, letters) {
  list.fold(letters, result, fn(acc, letter) {
    dict.insert(acc, string.lowercase(letter), score)
  })
})
```

바깥 fold는 점수마다, 안쪽 fold는 그 점수의 글자마다 돕니다. 안쪽 fold의 시작값이 바깥 누적값 `result`라는 점이 중요합니다. 새 dict로 시작하면 앞 점수에서 넣은 글자가 사라집니다. 빈 목록은 안쪽 fold가 한 번도 돌지 않으므로 따로 처리할 필요가 없습니다.

흔한 실수는 소문자 변환을 빠뜨리거나, `case letters { [first, ..] -> ... }`처럼 목록의 첫 글자만 넣는 것입니다.

"모양을 유지하는 변환은 map, 모양을 바꿔 새 값을 쌓는 변환은 fold"라는 구분은 이론 노트 「구조를 보존하는 변환, 함자」와 fold-universality(fold의 보편성)에서 다룹니다.
