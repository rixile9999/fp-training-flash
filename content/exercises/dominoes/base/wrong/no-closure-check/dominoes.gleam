import gleam/list

pub fn can_chain(stones: List(#(Int, Int))) -> Bool {
  case stones {
    [] -> True
    [#(_, end), ..rest] -> extend(end, rest)
  }
}

// 지금 끝의 수는 end다. remaining을 모두 이어 붙일 수 있는가?
fn extend(end: Int, remaining: List(#(Int, Int))) -> Bool {
  case remaining {
    [] -> True
    _ ->
      next_steps(end, remaining)
      |> list.any(fn(step) {
        let #(new_end, rest) = step
        extend(new_end, rest)
      })
  }
}

// end에 이을 수 있는 돌마다 #(이은 뒤의 끝 수, 그 돌 하나를 뺀 나머지).
fn next_steps(
  end: Int,
  stones: List(#(Int, Int)),
) -> List(#(Int, List(#(Int, Int)))) {
  selections(stones)
  |> list.filter_map(fn(selection) {
    let #(#(a, b), rest) = selection
    case a == end, b == end {
      True, _ -> Ok(#(b, rest))
      _, True -> Ok(#(a, rest))
      False, False -> Error(Nil)
    }
  })
}

// 각 원소와, 그 원소 하나만 뺀 나머지 목록의 쌍.
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
