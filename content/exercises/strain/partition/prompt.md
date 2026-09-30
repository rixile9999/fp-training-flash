목록과 조건 함수를 받아, 조건을 만족하는 원소와 만족하지 않는 원소로 나누는 `partition(items, predicate)`를 작성하세요.

- 반환값은 튜플 `#(조건이 True인 원소들, 조건이 False인 원소들)`이다.
- 두 목록 모두 원래 순서를 유지한다. 같은 값이 여러 번 나오면 모두 남긴다.
- 목록은 **한 번만** 순회한다. `keep`과 `discard`를 따로 호출하듯 두 번 훑지 않는다.
- `list.filter`, `list.partition`은 쓰지 않는다.

```gleam
partition([1, 2, 3, 4, 5], int.is_even)
// -> #([2, 4], [1, 3, 5])
```
