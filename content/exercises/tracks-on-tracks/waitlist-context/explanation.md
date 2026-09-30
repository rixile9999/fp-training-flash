명단은 연결 목록이므로 앞에 붙이기 `[name, ..queue]`는 즉시 끝나고, 뒤에 붙이기 `list.append(queue, [name])`는 목록 전체를 따라가 새로 만듭니다. 두 연산의 결과 순서가 다르다는 점이 요구의 핵심입니다. 일반 손님을 `[name, ..queue]`로 넣으면 새치기가 됩니다.

`seat_next`와 `next_two`는 명단의 모양으로 나눕니다.

```gleam
case queue {
  [first, second, ..] -> [first, second]
  short -> short
}
```

두 명 이상이면 앞의 두 명을, 그보다 짧으면(빈 목록이나 한 명) 명단 자체를 그대로 돌려줍니다. 흔한 실수는 마지막 분기를 `_ -> []`로 적어 한 명만 기다리는 경우에 그 손님을 잃어버리는 것입니다. `list.take(queue, 2)`, `list.drop(queue, 1)`도 같은 규칙을 따르므로 써도 좋습니다.

빈 목록과 "원소 하나 + 나머지"라는 두 모양으로 목록을 다루는 방식은 이론 노트 structural-recursion-induction(구조적 재귀와 귀납)에서 다룹니다.
