import gleam/list

pub fn chain(stones: List(#(Int, Int))) -> Result(List(#(Int, Int)), Nil) {
  case stones {
    [] -> Ok([])
    [#(first, end) as start, ..rest] -> extend(first, end, rest, [start])
  }
}

// placed는 지금까지 놓은 돌을 역순으로 담는다(마지막에 놓은 돌이 맨 앞).
fn extend(
  first: Int,
  end: Int,
  remaining: List(#(Int, Int)),
  placed: List(#(Int, Int)),
) -> Result(List(#(Int, Int)), Nil) {
  case remaining {
    [] -> Ok(list.reverse(placed))
    _ ->
      next_steps(end, remaining)
      |> list.find_map(fn(step) {
        let #(stone, rest) = step
        extend(first, stone.1, rest, [stone, ..placed])
      })
  }
}

// end에 이을 수 있는 돌마다 #(end 쪽이 왼쪽이 되도록 놓은 돌, 그 돌 하나를 뺀 나머지).
fn next_steps(
  end: Int,
  stones: List(#(Int, Int)),
) -> List(#(#(Int, Int), List(#(Int, Int)))) {
  selections(stones)
  |> list.filter_map(fn(selection) {
    let #(#(a, b), rest) = selection
    case a == end, b == end {
      True, _ -> Ok(#(#(a, b), rest))
      _, True -> Ok(#(#(b, a), rest))
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
