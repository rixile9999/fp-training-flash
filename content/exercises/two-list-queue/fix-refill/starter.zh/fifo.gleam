import gleam/list

/// 从前端取出、往后端放入的队列。
/// `front` 按取出顺序存放元素，`back` 按放入顺序的逆序存放元素。
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}

pub fn new() -> Queue(a) {
  Queue(front: [], back: [])
}

pub fn push(queue: Queue(a), item: a) -> Queue(a) {
  Queue(..queue, back: [item, ..queue.back])
}

pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  case queue.front, queue.back {
    [first, ..rest], back -> Ok(#(first, Queue(front: rest, back: back)))
    [], [] -> Error(Nil)
    [], back -> pop(Queue(front: back, back: []))
  }
}

pub fn to_list(queue: Queue(a)) -> List(a) {
  list.append(queue.front, list.reverse(queue.back))
}
