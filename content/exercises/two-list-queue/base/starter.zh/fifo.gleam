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
  todo
}

pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  todo
}

pub fn to_list(queue: Queue(a)) -> List(a) {
  todo
}
