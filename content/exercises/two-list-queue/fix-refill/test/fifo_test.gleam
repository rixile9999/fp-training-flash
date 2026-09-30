import fifo
import gleam/list
import gleeunit/should

fn push_all(queue: fifo.Queue(a), items: List(a)) -> fifo.Queue(a) {
  list.fold(items, queue, fifo.push)
}

// 큐가 빌 때까지 pop해서 꺼낸 순서대로 모은다.
fn drain(queue: fifo.Queue(a)) -> List(a) {
  drain_loop(queue, [])
}

fn drain_loop(queue: fifo.Queue(a), acc: List(a)) -> List(a) {
  case fifo.pop(queue) {
    Ok(#(item, rest)) -> drain_loop(rest, [item, ..acc])
    Error(Nil) -> list.reverse(acc)
  }
}

pub fn first_pop_returns_oldest_test() {
  let assert Ok(#(first, _)) = fifo.new() |> push_all([7, 8, 9]) |> fifo.pop
  first |> should.equal(7)
}

pub fn drains_each_item_once_test() {
  fifo.new()
  |> push_all([1, 2, 3])
  |> drain
  |> should.equal([1, 2, 3])
}

pub fn to_list_after_pop_test() {
  let assert Ok(#(_, rest)) = fifo.new() |> push_all(["a", "b", "c"]) |> fifo.pop
  rest
  |> fifo.to_list
  |> should.equal(["b", "c"])
}

pub fn pop_after_emptied_test() {
  let assert Ok(#(_, rest)) = fifo.new() |> push_all([1]) |> fifo.pop
  rest
  |> fifo.pop
  |> should.equal(Error(Nil))
}

pub fn refill_twice_test() {
  let queue = fifo.new() |> push_all([1, 2])
  let assert Ok(#(a, queue)) = fifo.pop(queue)
  let assert Ok(#(b, queue)) = fifo.pop(queue)
  let queue = push_all(queue, [3, 4, 5])
  [a, b, ..drain(queue)]
  |> should.equal([1, 2, 3, 4, 5])
}

pub fn keeps_order_when_mixed_test() {
  let queue = fifo.new() |> push_all([1, 2, 3])
  let assert Ok(#(_, queue)) = fifo.pop(queue)
  queue
  |> push_all([4])
  |> drain
  |> should.equal([2, 3, 4])
}

pub fn to_list_without_pop_test() {
  fifo.new()
  |> push_all([1, 2, 3])
  |> fifo.to_list
  |> should.equal([1, 2, 3])
}
