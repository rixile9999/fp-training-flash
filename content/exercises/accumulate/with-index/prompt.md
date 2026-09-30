`accumulate_indexed(list, fun)`을 작성하세요. 각 원소와 그 원소의 **위치 번호**를 함수에 넘겨, 결과로 새 목록을 만듭니다.

- `fun(원소, 위치 번호)`를 호출한다. 위치 번호는 첫 원소가 0이고 하나씩 증가한다.
- 결과 목록의 길이와 순서는 입력과 같다.
- `list.map`, `list.index_map` 같은 map 계열 함수는 쓰지 않는다. 재귀로 구현한다.

```gleam
accumulate_indexed(["a", "b", "c"], fn(x, i) { #(i, x) })
// -> [#(0, "a"), #(1, "b"), #(2, "c")]
```
