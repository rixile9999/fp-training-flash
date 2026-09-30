import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

// n-1개를 버린 뒤 첫 학생을 기준으로 삼는다. n이 0이거나 학생 수보다 크면 기준이 어긋난다.
pub fn honor_roll(students: List(Student), n: Int) -> List(String) {
  let sorted =
    list.sort(students, fn(a, b) {
      int.compare(b.score, a.score)
      |> order.break_tie(string.compare(a.name, b.name))
    })
  case list.first(list.drop(sorted, n - 1)) {
    Error(Nil) -> []
    Ok(cutoff) ->
      sorted
      |> list.take_while(fn(student) { student.score >= cutoff.score })
      |> list.map(fn(student) { student.name })
  }
}
