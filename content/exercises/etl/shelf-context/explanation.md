선반 하나가 코드 여러 개로 펼쳐지므로 기본 틀은 원래 점수표 변환과 같습니다. 바깥 `dict.fold`는 선반마다, 안쪽 `list.fold`는 그 선반의 코드마다 돌며 결과 dict에 항목을 쌓습니다.

```gleam
list.fold(codes, index, fn(acc, raw) {
  case normalize(raw) {
    "" -> acc
    code -> dict.insert(acc, code, shelf)
  }
})
```

이 문제의 핵심은 **정리한 뒤에 판단**하는 순서입니다. `"   "`는 정리 전에는 빈 문자열이 아니지만, 공백을 없애면 빈 문자열이 됩니다. 원본으로 빈 값인지 검사하고 나서 정리하면 `""` 키가 결과에 섞여 들어옵니다. 코드 하나를 정리하는 규칙을 `normalize`로 분리하면 "정리"와 "건너뛰기 판단"이 한 번의 `case`로 자연스럽게 이어지고, 정리 규칙이 바뀌어도 한 곳만 고치면 됩니다.

이렇게 모양이 바뀌는 변환을 빈 dict에서 시작해 쌓아 가는 방식은 이론 노트 fold-universality(fold의 보편성)에서 다룹니다.
