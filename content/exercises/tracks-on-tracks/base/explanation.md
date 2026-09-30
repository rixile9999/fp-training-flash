Gleam의 목록은 앞에서부터 이어진 연결 목록이라서 맨 앞에 붙이는 `[language, ..languages]`가 가장 자연스럽고 비용도 상수입니다. `list.append(languages, [language])`는 끝에 붙이므로 순서가 요구와 다르고, 목록 전체를 복사합니다.

개수와 뒤집기는 `list.length`, `list.reverse`로 충분합니다. 직접 재귀로 만들 수도 있지만, 이미 검증된 표준 함수를 쓰는 편이 의도가 분명합니다.

`exciting_list`는 "참이 되는 모양"을 목록 패턴으로 그대로 옮긴 것입니다.

```gleam
case languages {
  ["Gleam", ..] -> True
  [_, "Gleam"] | [_, "Gleam", _] -> True
  _ -> False
}
```

`[_, "Gleam"]`은 길이가 정확히 2, `[_, "Gleam", _]`은 정확히 3인 목록에만 맞으므로 길이 조건이 패턴 안에 들어 있습니다. 흔한 실수는 두 가지입니다.

- `list.contains(languages, "Gleam")`: 위치를 보지 않아서 세 번째에 있는 Gleam도 참이 됩니다.
- `[_, "Gleam", ..]`: 나머지 패턴 `..` 때문에 길이 4 이상인 목록까지 맞춰집니다.

목록을 "빈 목록이거나, 원소 하나와 나머지 목록"으로 보는 관점은 이론 노트 structural-recursion-induction(구조적 재귀와 귀납)에서, 경우를 빠짐없이 나누는 `case`는 「합 타입과 빠짐없는 분기」에서 더 다룹니다.
