import gleam/list

pub fn accumulate(list: List(a), fun: fn(a) -> b) -> List(b) {
  list.fold(list, [], fn(acc, item) { list.append([fun(item)], acc) })
}
