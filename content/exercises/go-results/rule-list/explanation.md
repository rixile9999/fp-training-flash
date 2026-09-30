규칙 개수가 정해져 있지 않으므로 "지금까지의 게임"을 누적값으로 들고 다니며 규칙을 하나씩 적용하는 fold가 필요합니다. 그런데 각 단계가 실패할 수 있으므로 보통의 `list.fold`가 아니라 `list.try_fold`를 씁니다.

```gleam
rules
|> list.try_fold(game, fn(current, rule) { rule(current) })
|> result.map(change_player)
```

`list.try_fold`는 함수가 `Ok(next)`를 돌려주면 `next`를 다음 누적값으로 삼고, `Error(e)`를 돌려주면 남은 규칙을 보지 않고 즉시 `Error(e)`를 반환합니다. 그래서 "첫 오류에서 멈춘다"와 "앞 규칙의 결과를 다음 규칙이 받는다"가 한 번에 해결됩니다. 빈 목록이면 초기 게임이 그대로 `Ok`로 나옵니다. 차례 바꾸기는 성공했을 때만 해야 하므로 `result.map`으로 붙입니다.

흔한 실수는 두 가지입니다.

- `list.fold` 안에서 실패한 규칙을 건너뛰고(현재 게임을 그대로 돌려주고) 마지막에 `Ok`로 감싸는 것. 오류가 사라지고, 규칙을 어긴 수가 성공한 수처럼 보입니다.
- `list.try_map(rules, fn(rule) { rule(game) })`처럼 모든 규칙을 **처음 게임**에 각각 적용하는 것. 오류는 잡히지만 규칙의 변경이 이어지지 않아서, 돌을 세 번 따내도 결과에는 한 번만 남습니다.

베이스 문제의 `result.try` 파이프라인을 목록 길이만큼 펼친 것이 `try_fold`라고 보면 됩니다. 이 관계는 이론 노트 "Result 연결과 모나드"(chaining-results-monads)에서 더 다룹니다.
