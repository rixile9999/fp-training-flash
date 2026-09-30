import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

// 정확히 n명에서 잘라 경계의 동점자를 떨어뜨린다.
pub fn honor_roll(students: List(Student), n: Int) -> List(String) {
  students
  |> list.sort(fn(a, b) {
    int.compare(b.score, a.score)
    |> order.break_tie(string.compare(a.name, b.name))
  })
  |> list.take(n)
  |> list.map(fn(student) { student.name })
}
