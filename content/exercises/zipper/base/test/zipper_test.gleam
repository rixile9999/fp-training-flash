import gleeunit/should
import zipper.{type Tree, Leaf, Node}

fn sample() -> Tree(Int) {
  Node(
    value: 1,
    left: Node(value: 2, left: Leaf, right: Node(value: 3, left: Leaf, right: Leaf)),
    right: Node(value: 4, left: Leaf, right: Leaf),
  )
}

pub fn data_is_retained_test() {
  sample()
  |> zipper.to_zipper
  |> zipper.to_tree
  |> should.equal(sample())
}

pub fn left_right_and_value_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.right(z)
  zipper.value(z)
  |> should.equal(Ok(3))
}

pub fn dead_end_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.left(z)
  #(zipper.left(z), zipper.right(z))
  |> should.equal(#(Error(Nil), Error(Nil)))
}

pub fn up_from_root_test() {
  sample()
  |> zipper.to_zipper
  |> zipper.up
  |> should.equal(Error(Nil))
}

pub fn tree_from_deep_focus_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.right(z)
  z
  |> zipper.to_tree
  |> should.equal(sample())
}

pub fn left_right_and_up_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.up(z)
  let assert Ok(z) = zipper.right(z)
  let assert Ok(z) = zipper.up(z)
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.right(z)
  zipper.value(z)
  |> should.equal(Ok(3))
}

pub fn descend_and_return_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.right(z)
  let assert Ok(z) = zipper.up(z)
  let assert Ok(z) = zipper.up(z)
  zipper.value(z)
  |> should.equal(Ok(1))
}

pub fn different_paths_to_same_zipper_test() {
  let z = zipper.to_zipper(sample())
  let assert Ok(z) = zipper.left(z)
  let assert Ok(z) = zipper.up(z)
  let assert Ok(z) = zipper.right(z)
  let assert Ok(other) = zipper.right(zipper.to_zipper(sample()))
  z
  |> should.equal(other)
}
