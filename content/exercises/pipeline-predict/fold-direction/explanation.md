정답은 `"cccbba"`입니다.

```gleam
["a", "b", "c"]
|> list.index_map(fn(s, i) { string.repeat(s, i + 1) })  // ["a", "bb", "ccc"]
|> list.fold("", fn(acc, s) { s <> acc })
// acc: "" -> "a" -> "bba" -> "cccbba"
```

`list.fold`는 목록을 **앞에서부터** 훑지만, 함수 `s <> acc`는 새 원소를 누적값의 **앞에** 붙입니다. 그래서 나중에 본 원소일수록 결과의 앞쪽에 옵니다. 목록을 앞에 붙이며 모으면 순서가 뒤집히는 것과 같은 원리입니다. 훑는 방향(fold 대 fold_right)과 붙이는 방향(`s <> acc` 대 `acc <> s`)은 서로 다른 두 가지 선택이고, 결과 순서는 둘의 조합으로 정해집니다(이론 주제 "fold의 보편성").

흔한 실수는 두 가지입니다. fold가 앞에서부터 훑으니 결과도 앞에서부터라고 생각해 `"abbccc"`라고 답하는 것, 그리고 `index_map`의 인덱스가 1부터라고 착각해 `"ccccbbbaa"`처럼 반복 횟수를 하나씩 늘리는 것입니다.
