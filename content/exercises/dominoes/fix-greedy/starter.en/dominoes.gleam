import gleam/list

pub fn can_chain(stones: List(#(Int, Int))) -> Bool {
  case stones {
    [] -> True
    [#(first, end), ..rest] -> extend(first, end, rest)
  }
}

// The chain's first number is first and the number at its current end is end. Can we attach all of remaining and come back to first?
fn extend(first: Int, end: Int, remaining: List(#(Int, Int))) -> Bool {
  case remaining {
    [] -> first == end
    _ ->
      case next_steps(end, remaining) {
        [#(new_end, rest), ..] -> extend(first, new_end, rest)
        [] -> False
      }
  }
}

// For each stone that can attach to end: #(the end number after attaching, the rest without that one stone).
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
