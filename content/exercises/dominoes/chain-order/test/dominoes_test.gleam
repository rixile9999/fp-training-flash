import dominoes.{chain}
import gleam/int
import gleam/list
import gleam/order.{type Order}
import gleeunit/should

// 결과가 입력 돌을 (뒤집기를 허용해) 정확히 한 번씩 쓰고,
// 이웃한 돌끼리 맞닿은 수가 같으며, 양 끝 수가 같은 사슬인지 확인한다.
fn is_valid_chain(
  input: List(#(Int, Int)),
  output: List(#(Int, Int)),
) -> Bool {
  same_stones(input, output) && links_match(output) && closes(output)
}

fn normalize(stones: List(#(Int, Int))) -> List(#(Int, Int)) {
  stones
  |> list.map(fn(s) { #(int.min(s.0, s.1), int.max(s.0, s.1)) })
  |> list.sort(compare_stone)
}

fn compare_stone(a: #(Int, Int), b: #(Int, Int)) -> Order {
  case int.compare(a.0, b.0) {
    order.Eq -> int.compare(a.1, b.1)
    other -> other
  }
}

fn same_stones(input: List(#(Int, Int)), output: List(#(Int, Int))) -> Bool {
  normalize(input) == normalize(output)
}

fn links_match(stones: List(#(Int, Int))) -> Bool {
  stones
  |> list.window_by_2
  |> list.all(fn(pair) { { pair.0 }.1 == { pair.1 }.0 })
}

fn closes(stones: List(#(Int, Int))) -> Bool {
  case list.first(stones), list.last(stones) {
    Ok(first), Ok(last) -> first.0 == last.1
    _, _ -> True
  }
}

fn check(input: List(#(Int, Int))) -> Bool {
  case chain(input) {
    Ok(output) -> is_valid_chain(input, output)
    Error(Nil) -> False
  }
}

pub fn empty_input_test() {
  chain([])
  |> should.equal(Ok([]))
}

pub fn singleton_double_test() {
  chain([#(3, 3)])
  |> should.equal(Ok([#(3, 3)]))
}

pub fn three_elements_form_chain_test() {
  check([#(1, 2), #(3, 1), #(2, 3)])
  |> should.be_true
}

pub fn no_chain_test() {
  chain([#(1, 2), #(4, 1), #(2, 3)])
  |> should.equal(Error(Nil))
}

pub fn open_path_is_not_a_chain_test() {
  chain([#(1, 2), #(3, 2), #(3, 4)])
  |> should.equal(Error(Nil))
}

pub fn flipped_stones_are_written_flipped_test() {
  check([#(1, 2), #(1, 3), #(2, 3)])
  |> should.be_true
}

pub fn needs_backtracking_test() {
  check([#(1, 2), #(2, 3), #(3, 1), #(2, 4), #(2, 4)])
  |> should.be_true
}

pub fn longer_chain_in_order_test() {
  check([
    #(1, 2),
    #(5, 3),
    #(3, 1),
    #(1, 2),
    #(2, 4),
    #(1, 6),
    #(2, 3),
    #(3, 4),
    #(5, 6),
  ])
  |> should.be_true
}
