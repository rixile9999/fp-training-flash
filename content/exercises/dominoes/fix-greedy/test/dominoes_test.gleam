import dominoes.{can_chain}
import gleeunit/should

pub fn three_elements_test() {
  can_chain([#(1, 2), #(3, 1), #(2, 3)])
  |> should.be_true
}

pub fn needs_backtracking_test() {
  can_chain([#(1, 2), #(2, 3), #(3, 1), #(2, 4), #(2, 4)])
  |> should.be_true
}

pub fn cant_be_chained_test() {
  can_chain([#(1, 2), #(4, 1), #(2, 3)])
  |> should.be_false
}

pub fn empty_input_test() {
  can_chain([])
  |> should.be_true
}

pub fn doubles_need_backtracking_test() {
  can_chain([#(1, 3), #(4, 3), #(1, 4), #(1, 1), #(4, 4)])
  |> should.be_true
}

pub fn duplicate_stones_test() {
  can_chain([#(1, 2), #(2, 1), #(1, 2), #(2, 1)])
  |> should.be_true
}
