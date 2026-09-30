import gleam/int
import gleam/list
import gleeunit/should
import list_ops

pub fn reverse_small_test() {
  list_ops.reverse([1, 3, 5, 7])
  |> should.equal([7, 5, 3, 1])
}

pub fn reverse_large_list_test() {
  let result = list_ops.reverse(numbers(200_000))
  list.take(result, 3)
  |> should.equal([200_000, 199_999, 199_998])
  list.length(result)
  |> should.equal(200_000)
}

pub fn reverse_empty_test() {
  list_ops.reverse([])
  |> should.equal([])
}

pub fn reverse_log_lines_test() {
  list_ops.reverse(["09:00 시작", "09:01 주문 접수", "09:02 결제 완료"])
  |> should.equal(["09:02 결제 완료", "09:01 주문 접수", "09:00 시작"])
}

pub fn append_still_works_test() {
  list_ops.append([1, 2], [3, 4, 5])
  |> should.equal([1, 2, 3, 4, 5])
}

pub fn foldl_still_works_test() {
  list_ops.foldl(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
  |> should.equal("abc")
}

/// [1, 2, ..., n]
fn numbers(n: Int) -> List(Int) {
  int.range(from: n, to: 0, with: [], run: fn(acc, i) { [i, ..acc] })
}
