import binary_search_tree.{type Tree, Empty, Node}
import gleam/int
import gleeunit/should

fn leaf(value: Int) -> Tree {
  Node(value, Empty, Empty)
}

//        8
//      /   \
//     3     10
//    / \      \
//   1   6      14
//      / \
//     4   7
fn sample() -> Tree {
  Node(
    8,
    Node(3, leaf(1), Node(6, leaf(4), leaf(7))),
    Node(10, Empty, leaf(14)),
  )
}

pub fn contains_found_test() {
  binary_search_tree.contains(sample(), 6)
  |> should.equal(True)
}

pub fn contains_missing_test() {
  binary_search_tree.contains(sample(), 5)
  |> should.equal(False)
}

pub fn contains_in_empty_tree_test() {
  binary_search_tree.contains(Empty, 0)
  |> should.equal(False)
}

pub fn minimum_test() {
  binary_search_tree.minimum(Node(
    8,
    Node(5, Node(2, leaf(1), Empty), Empty),
    Empty,
  ))
  |> should.equal(Ok(1))
}

pub fn minimum_of_empty_tree_test() {
  binary_search_tree.minimum(Empty)
  |> should.equal(Error(Nil))
}

pub fn minimum_without_left_child_test() {
  binary_search_tree.minimum(Node(5, Empty, Node(9, leaf(7), Empty)))
  |> should.equal(Ok(5))
}

pub fn many_lookups_in_large_tree_test() {
  // 짝수 0, 2, ..., 262_140이 들어 있는 균형 트리 (노드 131_071개)
  let tree = balanced(0, 131_070)
  // 0..39_999 중 짝수 20_000개는 있고 홀수 20_000개는 없다.
  int.range(from: 0, to: 40_000, with: 0, run: fn(found, value) {
    case binary_search_tree.contains(tree, value) {
      True -> found + 1
      False -> found
    }
  })
  |> should.equal(20_000)
}

/// low..high 번째 짝수로 만든 균형 트리
fn balanced(low: Int, high: Int) -> Tree {
  case low > high {
    True -> Empty
    False -> {
      let mid = { low + high } / 2
      Node(mid * 2, balanced(low, mid - 1), balanced(mid + 1, high))
    }
  }
}
