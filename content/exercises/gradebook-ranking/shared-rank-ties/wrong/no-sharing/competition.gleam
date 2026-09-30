import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

// 정렬 위치를 그대로 순위로 써서 동점자도 서로 다른 순위를 받는다.
pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  students
  |> list.sort(fn(a, b) {
    int.compare(b.score, a.score)
    |> order.break_tie(string.compare(a.name, b.name))
  })
  |> list.index_map(fn(student, index) { #(index + 1, student.name) })
}
