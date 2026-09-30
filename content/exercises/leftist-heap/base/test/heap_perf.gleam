import gleam/int
import gleam/list
import heap.{type Heap}

// 0부터 size - 1까지 오름차순으로 넣는다. 오른쪽 가지가 길어지기 쉬운 입력이다.
pub fn setup(size: Int) -> List(Int) {
  int.range(from: size - 1, to: -1, with: [], run: list.prepend)
}

// 모두 넣은 뒤 최솟값을 차례로 꺼내며 합을 구한다.
pub fn run(values: List(Int)) -> Int {
  let h = list.fold(values, heap.Empty, heap.insert)
  drain_sum(h, 0)
}

fn drain_sum(h: Heap, acc: Int) -> Int {
  case heap.find_min(h), heap.delete_min(h) {
    Ok(min), Ok(rest) -> drain_sum(rest, acc + min)
    _, _ -> acc
  }
}
