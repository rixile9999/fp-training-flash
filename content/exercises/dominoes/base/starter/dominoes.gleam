import gleam/list

pub fn can_chain(stones: List(#(Int, Int))) -> Bool {
  todo
}

// 각 원소와, 그 원소 하나만 뺀 나머지 목록의 쌍.
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
