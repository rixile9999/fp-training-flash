import fifo
import gleam/list
import gleeunit/should

fn parcels(ids: List(String)) -> fifo.Queue(String) {
  list.fold(ids, fifo.new(), fifo.push)
}

pub fn pop_returns_oldest_parcel_test() {
  let assert Ok(#(first, rest)) = parcels(["p1", "p2", "p3"]) |> fifo.pop
  #(first, fifo.to_list(rest))
  |> should.equal(#("p1", ["p2", "p3"]))
}

pub fn pop_empty_queue_test() {
  fifo.new()
  |> fifo.pop
  |> should.equal(Error(Nil))
}

pub fn takes_batch_in_arrival_order_test() {
  let #(batch, rest) = parcels(["p1", "p2", "p3", "p4"]) |> fifo.take(2)
  #(batch, fifo.to_list(rest))
  |> should.equal(#(["p1", "p2"], ["p3", "p4"]))
}

pub fn takes_everything_when_short_test() {
  let #(batch, rest) = parcels(["p1", "p2"]) |> fifo.take(5)
  #(batch, fifo.to_list(rest))
  |> should.equal(#(["p1", "p2"], []))
}

pub fn take_zero_keeps_queue_test() {
  let #(batch, rest) = parcels(["p1", "p2"]) |> fifo.take(0)
  #(batch, fifo.to_list(rest))
  |> should.equal(#([], ["p1", "p2"]))
}

pub fn take_negative_keeps_queue_test() {
  let #(batch, rest) = parcels(["p1"]) |> fifo.take(-3)
  #(batch, fifo.to_list(rest))
  |> should.equal(#([], ["p1"]))
}

pub fn consecutive_batches_test() {
  let queue = parcels(["p1", "p2", "p3"])
  let #(first, queue) = fifo.take(queue, 2)
  let queue = fifo.push(queue, "p4")
  let #(second, queue) = fifo.take(queue, 2)
  #(first, second, fifo.to_list(queue))
  |> should.equal(#(["p1", "p2"], ["p3", "p4"], []))
}
