import gleam/list

pub fn can_chain(stones: List(#(Int, Int))) -> Bool {
  todo
}

// Pairs of each element and the rest of the list with only that element removed.
// selections([a, b, c]) == [#(a, [b, c]), #(b, [a, c]), #(c, [a, b])]
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
