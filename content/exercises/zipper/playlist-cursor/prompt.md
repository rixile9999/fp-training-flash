음악 앱의 재생 목록에서 "지금 곡"을 가리키는 커서를 리스트 지퍼로 만드세요. 커서 타입과 `from_list`, `current`는 이미 있습니다.

```gleam
pub opaque type Cursor(a) {
  Cursor(before: List(a), current: a, after: List(a))
}
```

`before`는 지금 곡 앞의 곡들을 **지금 곡에 가까운 것부터**(원래 순서의 역순) 담고, `after`는 지금 곡 뒤의 곡들을 원래 순서대로 담습니다. 다음 네 함수를 구현하세요.

- `next(cursor)`: 다음 곡으로 옮긴다. 마지막 곡이면 `Error(Nil)`.
- `previous(cursor)`: 앞 곡으로 옮긴다. 첫 곡이면 `Error(Nil)`.
- `to_list(cursor)`: 재생 목록 전체를 원래 순서대로 돌려준다.
- `remove_current(cursor)`: 지금 곡을 목록에서 지운다. 다음 곡이 있으면 그 곡이, 없으면 앞 곡이 지금 곡이 된다. 곡이 하나뿐이면 `Error(Nil)`.

`next`, `previous`, `remove_current`는 O(1)이어야 합니다. 채점에서 16,000곡을 끝까지 넘겼다가 처음으로 돌아오는 비용을 잽니다.

```gleam
let assert Ok(c) = from_list(["봄", "여름", "가을"])
let assert Ok(c) = next(c)           // 지금 곡: "여름", before: ["봄"], after: ["가을"]
let assert Ok(c) = remove_current(c) // 지금 곡: "가을"
to_list(c)                           // -> ["봄", "가을"]
```
