import binary_search_tree.{Empty, Node}
import gleeunit/should

pub fn sorted_small_test() {
  binary_search_tree.sorted_data([2, 1, 3])
  |> should.equal([1, 2, 3])
}

pub fn sorted_complex_test() {
  binary_search_tree.sorted_data([2, 1, 3, 6, 7, 5])
  |> should.equal([1, 2, 3, 5, 6, 7])
}

pub fn sorted_duplicates_test() {
  binary_search_tree.sorted_data([4, 2, 4, 2])
  |> should.equal([2, 2, 4, 4])
}

pub fn sorted_descending_input_test() {
  binary_search_tree.sorted_data([5, 4, 3, 2, 1])
  |> should.equal([1, 2, 3, 4, 5])
}

pub fn sorted_empty_test() {
  binary_search_tree.sorted_data([])
  |> should.equal([])
}

pub fn to_tree_unchanged_test() {
  binary_search_tree.to_tree([4, 2, 6, 4])
  |> should.equal(Node(
    4,
    Node(2, Empty, Node(4, Empty, Empty)),
    Node(6, Empty, Empty),
  ))
}
