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
