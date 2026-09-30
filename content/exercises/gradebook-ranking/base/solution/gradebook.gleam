import gleam/int
import gleam/list
import gleam/order.{type Order}
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  students
  |> list.sort(by_rank_order)
  |> list.index_map(fn(student, index) { #(index + 1, student.name) })
}

fn by_rank_order(a: Student, b: Student) -> Order {
  int.compare(b.score, a.score)
  |> order.break_tie(string.compare(a.name, b.name))
}
