import gleam/int
import gleam/list

pub type Student {
  Student(name: String, score: Int)
}

// 점수만 비교해서 동점자는 입력 순서대로 남는다.
pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  students
  |> list.sort(fn(a, b) { int.compare(b.score, a.score) })
  |> list.index_map(fn(student, index) { #(index + 1, student.name) })
}
