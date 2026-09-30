import gleam/list
import gleeunit/should
import heap.{type Heap, Empty, Node}

fn leaf(value: Int) -> Heap {
  Node(rank: 1, value: value, left: Empty, right: Empty)
}

fn from_list(values: List(Int)) -> Heap {
  list.fold(values, Empty, heap.insert)
}

// 최솟값을 차례로 꺼내 목록으로 만든다.
fn drain(h: Heap) -> List(Int) {
  case heap.find_min(h), heap.delete_min(h) {
    Ok(min), Ok(rest) -> [min, ..drain(rest)]
    _, _ -> []
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

pub fn make_puts_higher_rank_left_test() {
  heap.make(1, Empty, leaf(5))
  |> should.equal(Node(rank: 1, value: 1, left: leaf(5), right: Empty))
}

pub fn insert_then_find_min_test() {
  from_list([5, 3, 8])
  |> heap.find_min
  |> should.equal(Ok(3))
}

pub fn drains_in_ascending_order_test() {
  from_list([5, 1, 4, 2, 3])
  |> drain
  |> should.equal([1, 2, 3, 4, 5])
}

pub fn make_rank_from_shorter_side_test() {
  let tall = Node(rank: 2, value: 4, left: leaf(6), right: leaf(7))
  heap.make(1, leaf(9), tall)
  |> heap.rank
  |> should.equal(2)
}

pub fn delete_min_empty_test() {
  heap.delete_min(Empty)
  |> should.equal(Error(Nil))
}

pub fn keeps_duplicates_test() {
  from_list([2, 1, 2, 1])
  |> drain
  |> should.equal([1, 1, 2, 2])
}

pub fn merge_keeps_all_values_test() {
  heap.merge(from_list([1, 4, 7]), from_list([2, 3, 9, 10]))
  |> drain
  |> should.equal([1, 2, 3, 4, 7, 9, 10])
}

pub fn stays_leftist_test() {
  from_list([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
  |> is_leftist
  |> should.be_true
}
