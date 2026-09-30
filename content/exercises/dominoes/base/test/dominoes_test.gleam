import dominoes.{can_chain}
import gleeunit/should

pub fn singleton_double_test() {
  can_chain([#(1, 1)])
  |> should.be_true
}

pub fn three_elements_test() {
  can_chain([#(1, 2), #(3, 1), #(2, 3)])
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

pub fn singleton_that_cant_close_test() {
  can_chain([#(1, 2)])
  |> should.be_false
}

pub fn can_reverse_stones_test() {
  can_chain([#(1, 2), #(1, 3), #(2, 3)])
  |> should.be_true
}

pub fn disconnected_loops_test() {
  can_chain([#(1, 2), #(2, 1), #(3, 4), #(4, 3)])
  |> should.be_false
}

pub fn needs_backtracking_test() {
  can_chain([#(1, 2), #(2, 3), #(3, 1), #(2, 4), #(2, 4)])
  |> should.be_true
}
