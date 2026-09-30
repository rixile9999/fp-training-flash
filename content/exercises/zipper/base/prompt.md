이진 트리 위를 돌아다니는 지퍼(zipper)를 만드세요. 지퍼는 초점(focus)이 가리키는 부분 트리와, 루트에서 초점까지 내려온 경로(crumbs)를 함께 들고 다닙니다. 타입과 `to_zipper`, `value`는 이미 있습니다.

```gleam
pub type Crumb(a) {
  WentLeft(value: a, right: Tree(a))   // 부모 값이 value인 노드에서 왼쪽으로 내려옴. right는 남겨 둔 오른쪽 자식
  WentRight(value: a, left: Tree(a))   // 오른쪽으로 내려옴. left는 남겨 둔 왼쪽 자식
}

pub opaque type Zipper(a) {
  Zipper(focus: Tree(a), crumbs: List(Crumb(a)))   // crumbs는 가까운 부모가 맨 앞
}
```

다음 네 함수를 구현하세요. 모든 함수는 새 지퍼를 돌려주고 원래 지퍼는 바뀌지 않습니다.

- `left(zipper)`, `right(zipper)`: 초점을 왼쪽/오른쪽 자식으로 옮긴다. 초점이 `Leaf`면 `Error(Nil)`.
- `up(zipper)`: 초점을 부모로 옮긴다. 초점이 루트면 `Error(Nil)`.
- `to_tree(zipper)`: 초점이 어디에 있든 전체 트리를 돌려준다.

```gleam
// tree = 1(2(_, 3), 4)
let assert Ok(z) = to_zipper(tree) |> left      // 초점: 2
let assert Ok(z) = right(z)                      // 초점: 3
value(z)    // -> Ok(3)
to_tree(z)  // -> tree
```
