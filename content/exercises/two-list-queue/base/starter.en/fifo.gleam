import gleam/list

/// A queue that you take from at the front and add to at the back.
/// `front` holds items in the order they come out; `back` holds them in reverse order of insertion.
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}

pub fn new() -> Queue(a) {
  Queue(front: [], back: [])
}

pub fn push(queue: Queue(a), item: a) -> Queue(a) {
  todo
}

pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  todo
}

pub fn to_list(queue: Queue(a)) -> List(a) {
  todo
}
