import gleam/int
import list_ops

pub fn setup(size: Int) -> List(Int) {
  int.range(from: size, to: 0, with: [], run: fn(acc, i) { [i, ..acc] })
}

pub fn run(input: List(Int)) -> List(Int) {
  list_ops.map(input, fn(x) { x + 1 })
}
