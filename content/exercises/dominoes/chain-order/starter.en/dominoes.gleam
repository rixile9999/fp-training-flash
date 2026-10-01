import gleam/list

pub fn chain(stones: List(#(Int, Int))) -> Result(List(#(Int, Int)), Nil) {
  todo
}

// Pairs of each element and the rest of the list with only that element removed.
fn selections(items: List(a)) -> List(#(a, List(a))) {
  case items {
    [] -> []
    [first, ..rest] -> [
      #(first, rest),
      ..list.map(selections(rest), fn(selection) {
        #(selection.0, [first, ..selection.1])
      })
    ]
  }
}
