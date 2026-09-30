import gleam/int
import gleam/list
import gleeunit/should
import list_ops

pub fn append_empty_lists_test() {
  list_ops.append(first: [], second: [])
  |> should.equal([])
}

pub fn append_keeps_order_test() {
  list_ops.append(first: [1, 2], second: [2, 3, 4, 5])
  |> should.equal([1, 2, 2, 3, 4, 5])
}

pub fn append_to_empty_first_test() {
  list_ops.append(first: [], second: [1, 2, 3, 4])
  |> should.equal([1, 2, 3, 4])
}

pub fn concat_lists_test() {
  list_ops.concat([[1, 2], [3], [], [4, 5, 6]])
  |> should.equal([1, 2, 3, 4, 5, 6])
}

pub fn concat_empty_test() {
  list_ops.concat([])
  |> should.equal([])
}

pub fn concat_keeps_inner_lists_test() {
  list_ops.concat([[[1], [2]], [[3]], [[]], [[4, 5, 6]]])
  |> should.equal([[1], [2], [3], [], [4, 5, 6]])
}

pub fn concat_many_small_lists_test() {
  let lists =
    int.range(from: 100_000, to: 0, with: [], run: fn(acc, i) {
      [[i, i], ..acc]
    })
  let result = list_ops.concat(lists)
  list.take(result, 4)
  |> should.equal([1, 1, 2, 2])
  list.length(result)
  |> should.equal(200_000)
}
