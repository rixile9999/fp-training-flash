import gleam/int
import gleam/list
import gleeunit/should
import heap.{type Heap, Empty, Node}

fn leaf(value: Int) -> Heap {
  Node(rank: 1, value: value, left: Empty, right: Empty)
}

fn from_list(values: List(Int)) -> Heap {
  list.fold(values, Empty, heap.insert)
}

fn drain(h: Heap) -> List(Int) {
  case heap.find_min(h), heap.delete_min(h) {
    Ok(min), Ok(rest) -> [min, ..drain(rest)]
    _, _ -> []
  }
}

// 오른쪽 자식만 따라 내려간 노드 수.
fn right_spine(h: Heap) -> Int {
  case h {
    Empty -> 0
    Node(right:, ..) -> 1 + right_spine(right)
  }
}

// 모든 노드에서 rank(left) >= rank(right)이고 rank = rank(right) + 1인지 확인한다.
fn is_leftist(h: Heap) -> Bool {
  case h {
    Empty -> True
    Node(rank:, left:, right:, ..) ->
      heap.rank(left) >= heap.rank(right)
      && rank == heap.rank(right) + 1
      && is_leftist(left)
      && is_leftist(right)
  }
}

pub fn drains_in_ascending_order_test() {
  from_list([5, 1, 4, 2, 3])
  |> drain
  |> should.equal([1, 2, 3, 4, 5])
}

pub fn make_moves_taller_child_left_test() {
  heap.make(1, Empty, leaf(5))
  |> should.equal(Node(rank: 1, value: 1, left: leaf(5), right: Empty))
}

pub fn ascending_inserts_keep_right_spine_short_test() {
  let values = int.range(from: 63, to: 0, with: [], run: list.prepend)
  let spine = from_list(values) |> right_spine
  { spine <= 6 }
  |> should.be_true
}

pub fn make_keeps_taller_child_left_test() {
  heap.make(1, leaf(5), Empty)
  |> should.equal(Node(rank: 1, value: 1, left: leaf(5), right: Empty))
}

pub fn make_rank_from_shorter_side_test() {
  let tall = Node(rank: 2, value: 4, left: leaf(6), right: leaf(7))
  heap.make(1, tall, leaf(9))
  |> heap.rank
  |> should.equal(2)
}

pub fn stays_leftist_after_deletes_test() {
  let assert Ok(h) = from_list([8, 3, 5, 1, 9, 2, 7, 4, 6]) |> heap.delete_min
  let assert Ok(h) = heap.delete_min(h)
  h
  |> is_leftist
  |> should.be_true
}
