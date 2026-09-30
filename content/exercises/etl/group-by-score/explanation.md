타일 하나가 점수 묶음 하나에 **추가**되어야 하므로, 점수 키가 이미 있는지 없는지에 따라 할 일이 다릅니다. `dict.upsert`가 정확히 이 두 경우를 `Some(기존 목록)`과 `None`으로 나눠 줍니다.

```gleam
scores
|> dict.fold(dict.new(), fn(groups, letter, score) {
  dict.upsert(groups, score, fn(existing) {
    case existing {
      Some(letters) -> [string.uppercase(letter), ..letters]
      None -> [string.uppercase(letter)]
    }
  })
})
|> dict.map_values(fn(_score, letters) { list.sort(letters, string.compare) })
```

두 단계로 나눈 이유가 있습니다. dict를 fold하는 순서는 언어가 약속하지 않으므로, 모으는 단계의 목록 순서는 우연에 가깝습니다. 그래서 모으기가 끝난 뒤 묶음마다 명시적으로 정렬합니다. 두 번째 단계는 키와 묶음 개수를 바꾸지 않고 값만 바꾸므로 `dict.map_values`, 즉 구조를 보존하는 map입니다(「구조를 보존하는 변환, 함자」). 첫 단계는 모양을 바꾸며 값을 쌓는 fold입니다(fold-universality).

흔한 실수는 두 가지입니다.

- `dict.insert(groups, score, [letter])`로 기존 묶음을 덮어써서 점수마다 타일이 하나만 남는 것.
- 정렬을 빠뜨려 dict 순회 순서가 그대로 결과에 드러나는 것. 특히 `list.append`로 뒤에 붙이면 작은 입력에서는 맞아 보입니다. BEAM에서는 키가 32개 이하인 작은 dict가 구현상 키 순서로 순회되기 때문입니다. 언어가 약속한 동작은 아닙니다. 두 글자 타일이 더해져 키가 36개가 되면 순회 순서가 해시 순서로 바뀌고, 정렬하지 않은 묶음은 바로 뒤섞입니다.
