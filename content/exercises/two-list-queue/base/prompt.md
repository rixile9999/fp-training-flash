불변 리스트만으로 선입선출(FIFO) 큐를 만드세요. 큐 타입은 이미 정해져 있습니다.

```gleam
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}
```

`front`는 꺼낼 순서대로, `back`은 넣은 순서의 **역순**으로 원소를 담습니다. 다음 세 함수를 구현하세요.

- `push(queue, item)`: `item`을 큐의 맨 뒤에 넣은 새 큐를 돌려준다.
- `pop(queue)`: 맨 앞 원소와 나머지 큐를 `Ok(#(item, rest))`로 돌려준다. 큐가 비었으면 `Error(Nil)`이다.
- `to_list(queue)`: 큐의 원소를 꺼낼 순서(먼저 넣은 것부터)대로 나열한다.

모든 함수는 새 큐를 돌려주며, 인자로 받은 큐는 바뀌지 않습니다. 원소 n개를 넣고 모두 꺼내는 전체 비용이 O(n)이어야 합니다. 채점에서 16,000개까지 넣고 꺼내는 비용을 잽니다.

```gleam
let q = fifo.new() |> fifo.push(1) |> fifo.push(2)
fifo.pop(q)
// -> Ok(#(1, 원소 2만 남은 큐))
fifo.to_list(fifo.push(q, 3))
// -> [1, 2, 3]
```
