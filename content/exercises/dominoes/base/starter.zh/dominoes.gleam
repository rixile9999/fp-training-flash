import gleam/list

pub fn can_chain(stones: List(#(Int, Int))) -> Bool {
  todo
}

// 每个元素与只去掉该元素后的其余列表组成的配对。
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
