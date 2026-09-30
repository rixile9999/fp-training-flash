import gleam/int
import gleam/list
import gleam/option.{None, Some}
import gleam/order.{type Order}
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  let #(_, ranked) =
    students
    |> list.sort(by_rank_order)
    |> list.index_fold(#(None, []), fn(state, student, index) {
      let #(previous, acc) = state
      let score = student.score
      let this_rank = case previous {
        Some(#(previous_score, previous_rank)) if previous_score == score ->
          previous_rank
        _ -> index + 1
      }
      #(Some(#(score, this_rank)), [#(this_rank, student.name), ..acc])
    })
  list.reverse(ranked)
}

fn by_rank_order(a: Student, b: Student) -> Order {
  int.compare(b.score, a.score)
  |> order.break_tie(string.compare(a.name, b.name))
}
