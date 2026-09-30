import gleeunit/should
import zipper.{type Tree, Leaf, Node}

fn leaf(value: a) -> Tree(a) {
  Node(value: value, left: Leaf, right: Leaf)
}

fn sample() -> Tree(Int) {
  Node(
    value: 1,
    left: Node(value: 2, left: Leaf, right: leaf(3)),
    right: leaf(4),
  )
}

pub fn set_value_test() {
  let assert Ok(z) = zipper.left(zipper.to_zipper(sample()))
  z
  |> zipper.set_value(5)
  |> zipper.to_tree
  |> should.equal(Node(1, Node(5, Leaf, leaf(3)), leaf(4)))
}

pub fn set_left_with_leaf_test() {
  let assert Ok(z) = zipper.left(zipper.to_zipper(sample()))
  let assert Ok(z) = zipper.set_left(z, leaf(5))
  z
  |> zipper.to_tree
  |> should.equal(Node(1, Node(2, leaf(5), leaf(3)), leaf(4)))
}

pub fn set_right_with_empty_test() {
  let assert Ok(z) = zipper.left(zipper.to_zipper(sample()))
  let assert Ok(z) = zipper.set_right(z, Leaf)
  z
  |> zipper.to_tree
  |> should.equal(Node(1, Node(2, Leaf, Leaf), leaf(4)))
}

pub fn set_value_after_traversing_up_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.right(z)
  let assert Ok(z) = zipper.up(z)
  z
  |> zipper.set_value(5)
  |> zipper.to_tree
  |> should.equal(Node(1, Node(5, Leaf, leaf(3)), leaf(4)))
}

pub fn set_right_with_subtree_test() {
  let subtree = Node(6, leaf(7), leaf(8))
  let assert Ok(z) = zipper.set_right(zipper.to_zipper(sample()), subtree)
  z
  |> zipper.to_tree
  |> should.equal(Node(1, Node(2, Leaf, leaf(3)), subtree))
}

pub fn set_value_on_leaf_creates_node_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.left(z)
  z
  |> zipper.set_value(9)
  |> zipper.to_tree
  |> should.equal(Node(1, Node(2, leaf(9), leaf(3)), leaf(4)))
}

pub fn set_child_on_leaf_fails_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.right(z)
  let assert Ok(z) = zipper.right(z)
  #(zipper.set_left(z, leaf(5)), zipper.set_right(z, leaf(5)))
  |> should.equal(#(Error(Nil), Error(Nil)))
}

pub fn focus_stays_after_edit_test() {
  let assert Ok(z) = zipper.left(zipper.to_zipper(sample()))
  let z = zipper.set_value(z, 5)
  let assert Ok(z) = zipper.set_left(z, leaf(6))
  let assert Ok(parent) = zipper.up(z)
  #(zipper.value(z), zipper.value(parent))
  |> should.equal(#(Ok(5), Ok(1)))
}
