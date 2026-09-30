import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/string

pub fn distance(from source: String, to target: String) -> Int {
  let a = string.to_graphemes(source)
  let b = string.to_graphemes(target)
  let #(result, _) = go(a, list.length(a), b, list.length(b), dict.new())
  result
}

// memo를 넘기기만 하고 갱신된 memo를 받아 쓰지 않아서, 세 호출이 서로의 결과를
// 재사용하지 못한다. 저장은 하지만 사실상 메모이제이션이 없다.
/// a(남은 길이 la)를 b(남은 길이 lb)로 바꾸는 최소 편집 횟수와 갱신된 memo.
/// 뒷부분 쌍은 남은 길이 #(la, lb)로 식별된다.
fn go(
  a: List(String),
  la: Int,
  b: List(String),
  lb: Int,
  memo: Dict(#(Int, Int), Int),
) -> #(Int, Dict(#(Int, Int), Int)) {
  case dict.get(memo, #(la, lb)) {
    Ok(known) -> #(known, memo)
    Error(Nil) -> {
      let #(value, memo) = compute(a, la, b, lb, memo)
      #(value, dict.insert(memo, #(la, lb), value))
    }
  }
}

fn compute(
  a: List(String),
  la: Int,
  b: List(String),
  lb: Int,
  memo: Dict(#(Int, Int), Int),
) -> #(Int, Dict(#(Int, Int), Int)) {
  case a, b {
    [], _ -> #(lb, memo)
    _, [] -> #(la, memo)
    [x, ..xs], [y, ..ys] if x == y -> go(xs, la - 1, ys, lb - 1, memo)
    [_, ..xs], [_, ..ys] -> {
      let #(replace, _) = go(xs, la - 1, ys, lb - 1, memo)
      let #(delete, _) = go(xs, la - 1, b, lb, memo)
      let #(insert, _) = go(a, la, ys, lb - 1, memo)
      #(1 + int.min(replace, int.min(delete, insert)), memo)
    }
  }
}
