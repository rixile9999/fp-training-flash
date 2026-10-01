import gleam/list

pub fn chain(stones: List(#(Int, Int))) -> Result(List(#(Int, Int)), Nil) {
  todo
}

// 每个元素与只去掉该元素后的其余列表组成的配对。
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
