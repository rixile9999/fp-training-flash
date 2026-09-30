정수를 담는 이진 탐색 트리를 만드는 함수 두 개를 구현하세요.

```gleam
pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}
```

- `to_tree(data)`: 빈 트리에서 시작해 목록의 **앞 원소부터** 차례로 넣은 트리를 반환한다.
  - 넣을 값이 노드 값보다 **작거나 같으면** 왼쪽 서브트리에, 크면 오른쪽 서브트리에 넣는다.
  - 빈 자리(`Empty`)에 도착하면 `Node(값, Empty, Empty)`를 만든다.
- `sorted_data(data)`: 목록으로 트리를 만든 뒤 트리의 값을 오름차순 목록으로 돌려준다. 같은 값은 개수만큼 모두 남긴다.

```gleam
to_tree([4, 2, 6, 3])
// -> Node(4, Node(2, Empty, Node(3, Empty, Empty)), Node(6, Empty, Empty))
sorted_data([2, 1, 3, 6, 7, 5])
// -> [1, 2, 3, 5, 6, 7]
```
