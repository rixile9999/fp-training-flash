목록과 조건 함수(`fn(t) -> Bool`)를 받는 두 함수를 작성하세요.

- `keep(items, predicate)`: 조건이 `True`인 원소만 남긴 목록을 반환한다.
- `discard(items, predicate)`: 조건이 `True`인 원소를 버리고, 나머지를 반환한다.
- 두 함수 모두 남은 원소의 원래 순서를 유지한다.
- `list.filter`, `list.partition` 같은 거르기 함수는 쓰지 않는다. 재귀로 구현한다.

같은 목록과 조건에 대해 `keep`과 `discard`의 결과를 합치면 원래 원소가 빠짐없이 모입니다.

```gleam
keep([1, 2, 3, 4, 5], int.is_even)
// -> [2, 4]
discard([1, 2, 3, 4, 5], int.is_even)
// -> [1, 3, 5]
```
