import gleam/int
import gleam/list
import gleam/option.{None, Some}
import gleam/order
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

// 새 점수가 나올 때마다 순위를 1씩만 올려서 1, 2, 2, 3 방식이 된다.
pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  let #(_, ranked) =
    students
    |> list.sort(fn(a, b) {
      int.compare(b.score, a.score)
      |> order.break_tie(string.compare(a.name, b.name))
    })
    |> list.fold(#(None, []), fn(state, student) {
      let #(previous, acc) = state
      let score = student.score
      let this_rank = case previous {
        Some(#(previous_score, previous_rank)) if previous_score == score ->
          previous_rank
        Some(#(_, previous_rank)) -> previous_rank + 1
        None -> 1
      }
      #(Some(#(score, this_rank)), [#(this_rank, student.name), ..acc])
    })
  list.reverse(ranked)
}
