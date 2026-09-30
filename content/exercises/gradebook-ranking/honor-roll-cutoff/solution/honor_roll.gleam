import gleam/int
import gleam/list
import gleam/order.{type Order}
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

pub fn honor_roll(students: List(Student), n: Int) -> List(String) {
  let sorted = list.sort(students, by_rank_order)
  case list.last(list.take(sorted, n)) {
    Error(Nil) -> []
    Ok(cutoff) ->
      sorted
      |> list.take_while(fn(student) { student.score >= cutoff.score })
      |> list.map(fn(student) { student.name })
  }
}

fn by_rank_order(a: Student, b: Student) -> Order {
  int.compare(b.score, a.score)
  |> order.break_tie(string.compare(a.name, b.name))
}
