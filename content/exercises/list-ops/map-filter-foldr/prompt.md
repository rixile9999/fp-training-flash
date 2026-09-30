`gleam/list`를 쓰지 않고 `foldr`, `map`, `filter`를 구현하세요.

- `foldr(over: list, from: initial, with: function)`: 목록의 **마지막 원소부터** 앞쪽으로 차례로 `function(누적값, 원소)`를 호출해 누적한 값을 반환한다. 빈 목록이면 `initial`을 반환한다.
- `map(list, function)`: 모든 원소에 `function`을 적용한 목록을 반환한다. 길이와 순서를 유지한다.
- `filter(list, function)`: `function(원소)`가 `True`인 원소만 원래 순서대로 남긴다.
- 원소가 20만 개인 목록도 시간 제한 안에 처리해야 한다.

```gleam
foldr(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
// -> "cba"
map([1, 3, 5, 7], fn(x) { x + 1 })          // -> [2, 4, 6, 8]
filter([1, 2, 3, 5], fn(x) { x % 2 == 1 })  // -> [1, 3, 5]
```
