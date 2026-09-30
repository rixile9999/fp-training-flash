import fifo
import gleam/int

pub fn setup(size: Int) -> Int {
  size
}

// size개를 넣은 뒤 모두 꺼내며 합을 구한다.
pub fn run(size: Int) -> Int {
  let queue = int.range(from: 0, to: size, with: fifo.new(), run: fifo.push)
  drain_sum(queue, 0)
}

fn drain_sum(queue: fifo.Queue(Int), acc: Int) -> Int {
  case fifo.pop(queue) {
    Ok(#(item, rest)) -> drain_sum(rest, acc + item)
    Error(Nil) -> acc
  }
}
