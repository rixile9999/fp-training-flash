import gleam/int
import gleam/list
import gleam/order.{type Order}
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

pub fn honor_roll(students: List(Student), n: Int) -> List(String) {
  todo
}
