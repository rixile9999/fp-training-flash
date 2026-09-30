import gleam/int
import merge_sort

pub fn setup(size: Int) -> List(Int) {
  pseudo_random_loop(size, 7, [])
}

pub fn run(input: List(Int)) -> List(Int) {
  merge_sort.sort_by(input, int.compare)
}

fn pseudo_random_loop(n: Int, seed: Int, acc: List(Int)) -> List(Int) {
  case n {
    0 -> acc
    _ -> {
      let next = { seed * 1_103_515_245 + 12_345 } % 2_147_483_648
      pseudo_random_loop(n - 1, next, [next % 1_000_000, ..acc])
    }
  }
}
