정수 최소 힙을 레프티스트 힙(leftist heap)으로 구현하세요. 모든 연산은 새 힙을 돌려주고 원래 힙은 바뀌지 않습니다.

```gleam
pub type Heap {
  Empty
  Node(rank: Int, value: Int, left: Heap, right: Heap)
}
```

- 부모의 `value`는 자식들의 `value`보다 작거나 같다(최소 힙).
- `rank`는 오른쪽 자식을 따라 `Empty`까지 내려가는 노드 수다. `Empty`의 rank는 0이다.
- **레프티스트 성질**: 모든 노드에서 `rank(left) >= rank(right)`이고, 노드의 `rank`는 `rank(right) + 1`이다.

`rank`와 `find_min`은 이미 있습니다. 다음 네 함수를 구현하세요.

- `make(value, a, b)`: `a`와 `b`를 자식으로 하는 노드를 만든다. rank가 큰 쪽을 왼쪽에 두고(같으면 `a`를 왼쪽), rank를 올바르게 정한다.
- `merge(a, b)`: 두 힙의 모든 값을 담은 힙. `make`를 써서 노드를 만든다.
- `insert(heap, value)`: 값 하나를 넣은 힙.
- `delete_min(heap)`: 최솟값(루트)을 뺀 힙을 `Ok`로 돌려준다. 빈 힙이면 `Error(Nil)`이다.

세 연산 모두 O(log n)이어야 합니다. 채점에서 0부터 8,000개를 오름차순으로 넣고 모두 꺼내는 비용을 잽니다.

```gleam
let leaf = fn(v) { Node(1, v, Empty, Empty) }
make(1, Empty, leaf(5))
// -> Node(rank: 1, value: 1, left: leaf(5), right: Empty)
[5, 3, 8] |> list.fold(Empty, insert) |> find_min
// -> Ok(3)
```
