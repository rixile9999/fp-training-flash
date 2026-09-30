import gleam/int
import gleam/list
import gleeunit/should
import merge_sort.{Shipment}

fn by_priority(a: merge_sort.Shipment, b: merge_sort.Shipment) {
  int.compare(a.priority, b.priority)
}

pub fn sorts_by_priority_test() {
  merge_sort.sort_by(
    [Shipment("A", 3), Shipment("B", 1), Shipment("C", 2)],
    by_priority,
  )
  |> should.equal([Shipment("B", 1), Shipment("C", 2), Shipment("A", 3)])
}

pub fn keeps_input_order_on_ties_test() {
  merge_sort.sort_by(
    [Shipment("A", 2), Shipment("B", 1), Shipment("C", 2), Shipment("D", 1)],
    by_priority,
  )
  |> should.equal([
    Shipment("B", 1),
    Shipment("D", 1),
    Shipment("A", 2),
    Shipment("C", 2),
  ])
}

pub fn empty_list_test() {
  merge_sort.sort_by([], by_priority)
  |> should.equal([])
}

pub fn follows_compare_function_test() {
  merge_sort.sort_by([3, 9, 1, 4], fn(a, b) { int.compare(b, a) })
  |> should.equal([9, 4, 3, 1])
}

pub fn many_ties_stay_in_order_test() {
  let shipments = [
    Shipment("s01", 2),
    Shipment("s02", 1),
    Shipment("s03", 3),
    Shipment("s04", 2),
    Shipment("s05", 1),
    Shipment("s06", 3),
    Shipment("s07", 2),
    Shipment("s08", 1),
    Shipment("s09", 3),
    Shipment("s10", 2),
    Shipment("s11", 1),
  ]
  merge_sort.sort_by(shipments, by_priority)
  |> list.map(fn(s) { s.id })
  |> should.equal([
    "s02", "s05", "s08", "s11", "s01", "s04", "s07", "s10", "s03", "s06", "s09",
  ])
}

pub fn sort_large_list_test() {
  let items = pseudo_random(150_000)
  merge_sort.sort_by(items, int.compare)
  |> should.equal(list.sort(items, int.compare))
}

/// 고정 시드로 만든 결정적 난수 목록
fn pseudo_random(n: Int) -> List(Int) {
  pseudo_random_loop(n, 42, [])
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
