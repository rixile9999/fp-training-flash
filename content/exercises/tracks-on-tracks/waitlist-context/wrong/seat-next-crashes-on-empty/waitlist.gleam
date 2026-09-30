import gleam/list

pub fn add_vip(queue: List(String), name: String) -> List(String) {
  [name, ..queue]
}

pub fn add_guest(queue: List(String), name: String) -> List(String) {
  list.append(queue, [name])
}

pub fn seat_next(queue: List(String)) -> List(String) {
  let assert [_, ..rest] = queue
  rest
}

pub fn next_two(queue: List(String)) -> List(String) {
  list.take(queue, 2)
}
