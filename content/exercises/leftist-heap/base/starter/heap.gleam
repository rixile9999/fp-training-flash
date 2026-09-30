/// 최소 힙. `rank`는 오른쪽 가지를 따라 Empty까지 내려가는 노드 수다.
/// 모든 노드에서 rank(left) >= rank(right)이고, rank = rank(right) + 1이다.
pub type Heap {
  Empty
  Node(rank: Int, value: Int, left: Heap, right: Heap)
}

pub fn rank(heap: Heap) -> Int {
  case heap {
    Empty -> 0
    Node(rank:, ..) -> rank
  }
}

pub fn find_min(heap: Heap) -> Result(Int, Nil) {
  case heap {
    Empty -> Error(Nil)
    Node(value:, ..) -> Ok(value)
  }
}

/// 값과 두 자식으로 노드를 만든다. rank가 큰 자식을 왼쪽에 둔다.
pub fn make(value: Int, a: Heap, b: Heap) -> Heap {
  todo
}

pub fn merge(a: Heap, b: Heap) -> Heap {
  todo
}

pub fn insert(heap: Heap, value: Int) -> Heap {
  todo
}

pub fn delete_min(heap: Heap) -> Result(Heap, Nil) {
  todo
}
