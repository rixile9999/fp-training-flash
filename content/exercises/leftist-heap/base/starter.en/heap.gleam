/// A min-heap. `rank` is the number of nodes on the way down the right branch to Empty.
/// At every node, rank(left) >= rank(right), and rank = rank(right) + 1.
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

/// Builds a node from a value and two children. The child with the higher rank goes on the left.
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
