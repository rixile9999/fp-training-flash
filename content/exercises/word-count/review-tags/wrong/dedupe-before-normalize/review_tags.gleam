import gleam/dict.{type Dict}
import gleam/list
import gleam/option
import gleam/string

pub fn count_tags(reviews: List(String)) -> Dict(String, Int) {
  reviews
  |> list.flat_map(tags_of)
  |> list.fold(dict.new(), increment)
}

/// 리뷰 한 건의 태그: 정리하고, 빈 태그를 버리고, 중복을 없앤다.
pub fn tags_of(review: String) -> List(String) {
  review
  |> string.split(",")
  |> list.unique
  |> list.map(normalize)
  |> list.filter(fn(tag) { tag != "" })
}

fn normalize(tag: String) -> String {
  tag
  |> string.trim
  |> string.lowercase
}

fn increment(counts: Dict(String, Int), tag: String) -> Dict(String, Int) {
  dict.upsert(counts, tag, fn(previous) { option.unwrap(previous, 0) + 1 })
}
