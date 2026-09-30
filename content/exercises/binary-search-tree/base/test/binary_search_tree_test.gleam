import binary_search_tree.{Empty, Node}
import gleeunit/should

pub fn data_is_retained_test() {
  binary_search_tree.to_tree([4])
  |> should.equal(Node(data: 4, left: Empty, right: Empty))
}

pub fn smaller_goes_left_test() {
  binary_search_tree.to_tree([4, 2])
  |> should.equal(Node(
    data: 4,
    left: Node(data: 2, left: Empty, right: Empty),
    right: Empty,
  ))
}

pub fn greater_goes_right_test() {
  binary_search_tree.to_tree([4, 5])
  |> should.equal(Node(
    data: 4,
    left: Empty,
    right: Node(data: 5, left: Empty, right: Empty),
  ))
}

pub fn equal_goes_left_test() {
  binary_search_tree.to_tree([4, 4])
  |> should.equal(Node(
    data: 4,
    left: Node(data: 4, left: Empty, right: Empty),
    right: Empty,
  ))
}

pub fn complex_tree_test() {
  binary_search_tree.to_tree([4, 2, 6, 1, 3, 5, 7])
  |> should.equal(Node(
    data: 4,
    left: Node(
      data: 2,
      left: Node(data: 1, left: Empty, right: Empty),
      right: Node(data: 3, left: Empty, right: Empty),
    ),
    right: Node(
      data: 6,
      left: Node(data: 5, left: Empty, right: Empty),
      right: Node(data: 7, left: Empty, right: Empty),
    ),
  ))
}

pub fn sorted_data_test() {
  binary_search_tree.sorted_data([2, 1, 3, 6, 7, 5])
  |> should.equal([1, 2, 3, 5, 6, 7])
}

pub fn sorted_data_keeps_duplicates_test() {
  binary_search_tree.sorted_data([3, 1, 3, 2, 1])
  |> should.equal([1, 1, 2, 3, 3])
}

pub fn sorted_data_empty_test() {
  binary_search_tree.sorted_data([])
  |> should.equal([])
}
