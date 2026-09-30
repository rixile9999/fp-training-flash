이진 탐색 트리(왼쪽 서브트리의 값은 모두 노드 값 **이하**, 오른쪽은 모두 노드 값보다 **큼**)에서 쓰는 조회 함수 두 개를 구현하세요.

```gleam
pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}
```

- `contains(tree, value) -> Bool`: 트리에 `value`가 있으면 `True`, 없으면 `False`.
- `minimum(tree) -> Result(Int, Nil)`: 트리에서 가장 작은 값을 `Ok`로 반환한다. 빈 트리면 `Error(Nil)`.
- 노드가 13만 개인 균형 트리에서 4만 번 찾아도 시간 제한 안에 끝나야 한다. 비교할 때마다 **한쪽 서브트리로만** 내려간다.

```gleam
let tree = Node(8, Node(3, Node(1, Empty, Empty), Node(6, Empty, Empty)), Node(10, Empty, Empty))
contains(tree, 6)   // -> True
contains(tree, 7)   // -> False
minimum(tree)       // -> Ok(1)
minimum(Empty)      // -> Error(Nil)
```
