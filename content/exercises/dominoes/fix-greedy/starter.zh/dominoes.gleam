import gleam/list

pub fn can_chain(stones: List(#(Int, Int))) -> Bool {
  case stones {
    [] -> True
    [#(first, end), ..rest] -> extend(first, end, rest)
  }
}

// 链的第一个数是 first，当前末端的数是 end。能否把 remaining 全部接上并回到 first？
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

// 对每块能接到 end 上的骨牌：#(接上之后的末端数字, 去掉这一块后的剩余骨牌)。
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
