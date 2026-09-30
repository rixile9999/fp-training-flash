`gleam/list`를 쓰지 않고 목록 연산 세 가지를 직접 구현하세요.

- `foldl(over: list, from: initial, with: function)`: 목록의 **앞 원소부터** 차례로 `function(누적값, 원소)`를 호출해 누적한 최종 값을 반환한다. 빈 목록이면 `initial`을 그대로 반환한다.
- `length(list)`: 원소 개수를 반환한다.
- `reverse(list)`: 원소 순서를 뒤집은 새 목록을 반환한다.
- 원소가 20만 개인 목록도 시간 제한 안에 처리해야 한다. 원소 하나를 처리할 때마다 목록 전체를 다시 훑거나 복사하면 안 된다.

```gleam
foldl(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
// -> "abc"
length([1, 2, 3, 4])   // -> 4
reverse([1, 3, 5, 7])  // -> [7, 5, 3, 1]
```
