이진 트리 지퍼에 초점 자리를 고치는 연산을 추가하세요. 이동 함수(`to_zipper`, `left`, `right`, `up`, `to_tree`, `value`)는 이미 있습니다. 지퍼는 초점(focus)이 가리키는 부분 트리와 루트까지의 경로(crumbs)를 담습니다.

- `set_value(zipper, value)`: 초점 노드의 값을 `value`로 바꾼다. 자식은 그대로다. 초점이 `Leaf`면 `Node(value, Leaf, Leaf)`로 바꾼다.
- `set_left(zipper, tree)`: 초점 노드의 왼쪽 자식을 `tree`로 바꾼다. 초점이 `Leaf`면 `Error(Nil)`.
- `set_right(zipper, tree)`: 초점 노드의 오른쪽 자식을 `tree`로 바꾼다. 초점이 `Leaf`면 `Error(Nil)`.

모든 함수는 새 지퍼를 돌려주며, 초점의 위치는 그대로입니다. 원래 지퍼는 바뀌지 않습니다.

```gleam
// tree = 1(2(_, 3), 4)
let assert Ok(z) = to_zipper(tree) |> left      // 초점: 2
z |> set_value(5) |> to_tree
// -> 1(5(_, 3), 4)
```
