택배 상차장에서는 도착한 택배를 대기열에 넣었다가 트럭이 오면 앞에서부터 정해진 개수만큼 싣습니다. 대기열은 리스트 두 개로 만든 큐입니다. `new`, `push`, `to_list`는 이미 있습니다(`front`는 꺼낼 순서, `back`은 넣은 순서의 역순). 다음 두 함수를 구현하세요.

- `pop(queue)`: 가장 먼저 넣은 원소와 나머지 큐를 `Ok(#(item, rest))`로 돌려준다. 빈 큐면 `Error(Nil)`이다.
- `take(queue, n)`: 앞에서부터 최대 `n`개를 꺼내 `#(꺼낸 원소 목록, 남은 큐)`를 돌려준다.
  - 꺼낸 원소 목록은 도착 순서(먼저 넣은 것이 앞)다.
  - 큐의 원소가 `n`개보다 적으면 있는 것을 모두 꺼낸다.
  - `n`이 0 이하이면 아무것도 꺼내지 않고 큐를 그대로 돌려준다.

```gleam
let q = fifo.new() |> fifo.push("p1") |> fifo.push("p2") |> fifo.push("p3")
let #(batch, rest) = fifo.take(q, 2)
// batch -> ["p1", "p2"]
// fifo.to_list(rest) -> ["p3"]
```
