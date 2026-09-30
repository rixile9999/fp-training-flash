import gleam/int
import gleam/list
import gleam/order.{type Order}
import gleam/string

pub type Student {
  Student(name: String, score: Int)
}

pub fn rank(students: List(Student)) -> List(#(Int, String)) {
  todo
}
