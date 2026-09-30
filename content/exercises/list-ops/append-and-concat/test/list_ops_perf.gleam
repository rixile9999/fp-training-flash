import gleam/int
import list_ops

/// size개의 짧은 목록(원소 3개씩)
pub fn setup(size: Int) -> List(List(Int)) {
  int.range(from: size, to: 0, with: [], run: fn(acc, i) { [[i, i, i], ..acc] })
}

pub fn run(input: List(List(Int))) -> List(Int) {
  list_ops.concat(input)
}
