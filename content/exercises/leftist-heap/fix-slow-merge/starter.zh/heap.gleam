/// 最小堆。`rank` 是沿右分支一直走到 Empty 所经过的节点数。
/// 在每个节点上，rank(left) >= rank(right)，且 rank = rank(right) + 1。
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

/// 用一个值和两个子节点创建节点。rank 较大的子节点放在左边。
pub fn make(value: Int, a: Heap, b: Heap) -> Heap {
  Node(rank: rank(b) + 1, value: value, left: a, right: b)
}

pub fn merge(a: Heap, b: Heap) -> Heap {
  case a, b {
    Empty, heap | heap, Empty -> heap
    Node(value: x, left: left_a, right: right_a, ..), Node(value: y, ..)
      if x <= y
    -> make(x, left_a, merge(right_a, b))
    _, Node(value: y, left: left_b, right: right_b, ..) ->
      make(y, left_b, merge(a, right_b))
  }
}

pub fn insert(heap: Heap, value: Int) -> Heap {
  merge(heap, Node(rank: 1, value: value, left: Empty, right: Empty))
}

pub fn delete_min(heap: Heap) -> Result(Heap, Nil) {
  case heap {
    Empty -> Error(Nil)
    Node(left:, right:, ..) -> Ok(merge(left, right))
  }
}
