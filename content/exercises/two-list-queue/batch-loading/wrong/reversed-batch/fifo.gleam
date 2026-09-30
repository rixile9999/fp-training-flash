import gleam/list

/// 앞에서 꺼내고 뒤에 넣는 큐.
/// `front`는 꺼낼 순서대로, `back`은 넣은 순서의 역순으로 담는다.
pub opaque type Queue(a) {
  Queue(front: List(a), back: List(a))
}

pub fn new() -> Queue(a) {
  Queue(front: [], back: [])
}

pub fn push(queue: Queue(a), item: a) -> Queue(a) {
  Queue(..queue, back: [item, ..queue.back])
}

pub fn to_list(queue: Queue(a)) -> List(a) {
  list.append(queue.front, list.reverse(queue.back))
}

pub fn pop(queue: Queue(a)) -> Result(#(a, Queue(a)), Nil) {
  case queue.front, queue.back {
    [first, ..rest], back -> Ok(#(first, Queue(front: rest, back: back)))
    [], [] -> Error(Nil)
    [], back -> pop(Queue(front: list.reverse(back), back: []))
  }
}

pub fn take(queue: Queue(a), n: Int) -> #(List(a), Queue(a)) {
  take_loop(queue, n, [])
}

fn take_loop(queue: Queue(a), n: Int, taken: List(a)) -> #(List(a), Queue(a)) {
  case n > 0 {
    False -> #(taken, queue)
    True ->
      case pop(queue) {
        Ok(#(item, rest)) -> take_loop(rest, n - 1, [item, ..taken])
        Error(Nil) -> #(taken, queue)
      }
  }
}
