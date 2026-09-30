`keep`은 목록을 한 칸씩 내려가며 원소마다 "남길까?"만 결정합니다. 조건이 참이면 누적자에 넣고, 거짓이면 건너뜁니다. 누적자 앞에 쌓았으므로 끝에서 `list.reverse`로 원래 순서를 되돌립니다.

```gleam
case items {
  [] -> list.reverse(acc)
  [first, ..rest] ->
    case predicate(first) {
      True -> go(rest, predicate, [first, ..acc])
      False -> go(rest, predicate, acc)
    }
}
```

`discard`는 "조건을 뒤집은 keep"입니다. 재귀를 다시 쓰지 않고 `keep(items, fn(item) { !predicate(item) })`로 만들면, 순회와 순서 유지 규칙이 한 곳에만 있어 두 함수가 어긋날 일이 없습니다. 함수를 값으로 넘겨 동작을 조립하는 이 방식은 이론 노트 higher-order-modularity(고차 함수와 모듈성)에서 다룹니다. 누적자와 마지막 뒤집기는 accumulators-and-tail-recursion(누적자와 꼬리 재귀)에서 다룹니다.

흔한 실수는 두 가지입니다.

- 누적자에 쌓고 뒤집지 않아 `[1, 3]` 대신 `[3, 1]`이 나오는 것.
- `discard`를 `keep`에서 복사하면서 조건 뒤집기를 빠뜨려 두 함수가 같은 결과를 내는 것.
