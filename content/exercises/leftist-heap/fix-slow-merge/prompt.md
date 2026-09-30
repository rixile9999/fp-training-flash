아래 `heap` 모듈은 정수 최소 힙을 레프티스트 힙으로 구현한 것입니다. 꺼내는 순서는 맞지만, 값을 오름차순으로 많이 넣으면 점점 느려져 수천 개에서 눈에 띄게 멈칫한다는 신고가 들어왔습니다. 고치세요.

- `rank`는 오른쪽 자식을 따라 `Empty`까지 내려가는 노드 수다. `Empty`의 rank는 0이다.
- 모든 노드에서 `rank(left) >= rank(right)`이고, 노드의 `rank`는 `rank(right) + 1`이어야 한다.
- `make(value, a, b)`는 rank가 큰 쪽을 왼쪽에 둔다. 같으면 `a`를 왼쪽에 둔다.
- `merge`, `insert`, `delete_min`은 O(log n)이어야 한다. 채점에서 8,000개를 오름차순으로 넣고 모두 꺼내는 비용을 잰다.

```gleam
make(1, Empty, Node(1, 5, Empty, Empty))
// 지금:   Node(rank: 1, value: 1, left: Empty, right: Node(1, 5, Empty, Empty))
// 기대값: Node(rank: 1, value: 1, left: Node(1, 5, Empty, Empty), right: Empty)
```
