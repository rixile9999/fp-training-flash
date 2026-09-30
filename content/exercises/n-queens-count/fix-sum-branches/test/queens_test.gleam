import gleeunit/should
import queens

pub fn four_queens_test() {
  queens.count_solutions(4)
  |> should.equal(2)
}

pub fn five_queens_test() {
  queens.count_solutions(5)
  |> should.equal(10)
}

pub fn single_queen_board_test() {
  queens.count_solutions(1)
  |> should.equal(1)
}

pub fn boards_without_solution_test() {
  #(queens.count_solutions(2), queens.count_solutions(3))
  |> should.equal(#(0, 0))
}

pub fn six_queens_test() {
  queens.count_solutions(6)
  |> should.equal(4)
}

pub fn eight_queens_test() {
  queens.count_solutions(8)
  |> should.equal(92)
}
