버그는 `increment`의 `dict.insert(counts, word, 1)`입니다. `dict.insert`는 키가 이미 있으면 값을 **덮어쓰기** 때문에, 같은 단어를 몇 번 만나도 횟수가 1로 되돌아갑니다.

필요한 것은 "기존 값을 보고 새 값을 정하는" 갱신입니다. `dict.upsert`는 기존 값을 `Option`으로 넘겨주므로 두 경우를 `case`로 나눌 수 있습니다.

```gleam
dict.upsert(counts, word, fn(previous) {
  case previous {
    Some(count) -> count + 1
    None -> 1
  }
})
```

`option.unwrap(previous, 0) + 1`처럼 한 줄로 써도 같습니다. 이때 기본값은 0이어야 합니다. `None -> 0`으로 적으면 처음 나온 단어가 0회로 시작해 모든 횟수가 하나씩 모자랍니다.

또 하나 주의할 점은 fold가 넘겨주는 누적값 `counts`를 갱신해야 한다는 것입니다. 매번 `dict.new()`에 넣으면 마지막 단어 하나만 남습니다. fold 한 단계는 "지금까지의 결과 + 원소 하나 -> 새 결과"라는 규칙이며, 이 관점은 이론 노트 fold-universality(fold의 보편성)에서 다룹니다.
