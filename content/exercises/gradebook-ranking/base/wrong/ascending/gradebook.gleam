import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

// 기본 비교 순서 그대로라 점수가 낮은 학생이 1위가 된다.
pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  students
  |> list.sort(fn(a, b) {
    int.compare(a.score, b.score)
    |> order.break_tie(string.compare(a.name, b.name))
  })
  |> list.index_map(fn(student, index) { #(index + 1, student.name) })
}
