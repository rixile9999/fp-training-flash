import gleeunit/should
import queens

pub fn four_queens_test() {
  queens.first_solution(4)
  |> should.equal(Ok([1, 3, 0, 2]))
}

pub fn single_queen_test() {
  queens.first_solution(1)
  |> should.equal(Ok([0]))
}

pub fn no_solution_test() {
  #(queens.first_solution(2), queens.first_solution(3))
  |> should.equal(#(Error(Nil), Error(Nil)))
}

pub fn five_queens_test() {
  queens.first_solution(5)
  |> should.equal(Ok([0, 2, 4, 1, 3]))
}

pub fn six_queens_needs_backtracking_test() {
  queens.first_solution(6)
  |> should.equal(Ok([1, 3, 5, 0, 2, 4]))
}

pub fn eight_queens_test() {
  queens.first_solution(8)
  |> should.equal(Ok([0, 4, 7, 5, 2, 6, 1, 3]))
}
