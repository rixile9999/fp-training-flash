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
    [] ->
      case first == end {
        True -> Ok(list.reverse(placed))
        False -> Error(Nil)
      }
    _ ->
      next_steps(end, remaining)
      |> list.find_map(fn(step) {
        let #(stone, rest) = step
        let new_end = case stone.0 == end {
          True -> stone.1
          False -> stone.0
        }
        extend(first, new_end, rest, [stone, ..placed])
      })
  }
}

// end에 이을 수 있는 돌마다 #(그 돌, 그 돌 하나를 뺀 나머지).
fn next_steps(
  end: Int,
  stones: List(#(Int, Int)),
) -> List(#(#(Int, Int), List(#(Int, Int)))) {
  selections(stones)
  |> list.filter_map(fn(selection) {
    let #(#(a, b), rest) = selection
    case a == end, b == end {
      True, _ -> Ok(#(#(a, b), rest))
      _, True -> Ok(#(#(a, b), rest))
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
