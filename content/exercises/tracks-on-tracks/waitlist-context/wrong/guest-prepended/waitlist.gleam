import gleam/list

pub fn add_vip(queue: List(String), name: String) -> List(String) {
  [name, ..queue]
}

pub fn add_guest(queue: List(String), name: String) -> List(String) {
  [name, ..queue]
}

pub fn seat_next(queue: List(String)) -> List(String) {
  case queue {
    [] -> []
    [_, ..rest] -> rest
  }
}

pub fn next_two(queue: List(String)) -> List(String) {
  case queue {
    [first, second, ..] -> [first, second]
    short -> short
  }
}
