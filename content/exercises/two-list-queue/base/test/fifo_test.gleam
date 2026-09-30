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

pub fn pop_empty_queue_test() {
  fifo.new()
  |> fifo.pop
  |> should.equal(Error(Nil))
}

pub fn pops_in_insertion_order_test() {
  fifo.new()
  |> push_all([1, 2, 3])
  |> drain
  |> should.equal([1, 2, 3])
}

pub fn to_list_front_to_back_test() {
  fifo.new()
  |> push_all(["a", "b", "c"])
  |> fifo.to_list
  |> should.equal(["a", "b", "c"])
}

pub fn interleaved_push_pop_test() {
  let queue = fifo.new() |> push_all([1, 2])
  let assert Ok(#(first, queue)) = fifo.pop(queue)
  first |> should.equal(1)
  queue
  |> push_all([3, 4])
  |> drain
  |> should.equal([2, 3, 4])
}

pub fn to_list_after_pop_test() {
  let queue = fifo.new() |> push_all([1, 2, 3])
  let assert Ok(#(_, queue)) = fifo.pop(queue)
  queue
  |> push_all([4, 5])
  |> fifo.to_list
  |> should.equal([2, 3, 4, 5])
}

pub fn old_version_unchanged_test() {
  let base = fifo.new() |> push_all([1, 2])
  let assert Ok(#(_, popped)) = fifo.pop(base)
  let pushed = fifo.push(base, 3)
  #(fifo.to_list(base), fifo.to_list(popped), fifo.to_list(pushed))
  |> should.equal(#([1, 2], [2], [1, 2, 3]))
}
