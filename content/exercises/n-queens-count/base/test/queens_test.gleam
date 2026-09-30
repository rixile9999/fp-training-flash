import gleeunit/should
import queens

pub fn same_column_is_unsafe_test() {
  queens.is_safe([2, 0], 2)
  |> should.be_false
}

pub fn diagonal_next_row_is_unsafe_test() {
  #(queens.is_safe([1], 2), queens.is_safe([1], 0), queens.is_safe([1], 3))
  |> should.equal(#(False, False, True))
}

pub fn four_queens_test() {
  queens.count_solutions(4)
  |> should.equal(2)
}

pub fn nearest_queen_first_test() {
  // 맨 앞의 0은 바로 윗 행이라 1열과 대각선이다. 3은 두 행 위라 안전하다.
  queens.is_safe([0, 3], 1)
  |> should.be_false
}

pub fn far_diagonal_is_unsafe_test() {
  // 바로 윗 행의 5열은 멀고, 두 행 위의 0열이 대각선이다.
  queens.is_safe([5, 0], 2)
  |> should.be_false
}

pub fn single_queen_board_test() {
  queens.count_solutions(1)
  |> should.equal(1)
}

pub fn boards_without_solution_test() {
  #(queens.count_solutions(2), queens.count_solutions(3))
  |> should.equal(#(0, 0))
}

pub fn eight_queens_test() {
  queens.count_solutions(8)
  |> should.equal(92)
}
