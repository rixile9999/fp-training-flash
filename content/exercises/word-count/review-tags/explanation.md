"리뷰 한 건 처리"와 "전체 집계"를 나누면 각 부분이 단순해집니다.

```gleam
pub fn tags_of(review: String) -> List(String) {
  review
  |> string.split(",")
  |> list.map(normalize)                 // 공백 제거 + 소문자
  |> list.filter(fn(tag) { tag != "" })  // 빈 태그 버리기
  |> list.unique                         // 리뷰 안 중복 제거
}

pub fn count_tags(reviews: List(String)) -> Dict(String, Int) {
  reviews
  |> list.flat_map(tags_of)
  |> list.fold(dict.new(), increment)
}
```

세는 대상이 "태그 등장 횟수"가 아니라 "태그가 달린 리뷰 수"이므로, 리뷰 단위로 중복을 먼저 없앤 뒤 모든 리뷰의 태그를 이어 붙여 셉니다. 중복 제거를 `count_tags` 전체에 걸면 여러 리뷰에 걸친 정상적인 등장까지 사라지므로, 반드시 리뷰 하나 안에서 해야 합니다.

단계 순서도 중요합니다. `"Fast"`와 `" fast"`는 정리하기 전에는 다른 문자열이라서, 중복 제거를 정리보다 먼저 하면 둘 다 살아남습니다. 빈 태그 거르기도 정리 뒤여야 `" "` 같은 태그를 버릴 수 있습니다. 파이프라인에서 "정리 -> 판단" 순서를 지키는 것이 이 문제에서 가장 흔히 틀리는 부분입니다.

중복 제거에 `set.from_list`와 `set.to_list`를 쓰면 처음 나온 순서가 사라집니다. `tags_of`는 순서를 지켜야 하므로 순서를 유지하는 `list.unique`를 씁니다.

작은 변환을 순서 있게 합성하는 관점은 이론 노트 function-composition-pipelines(함수 합성과 파이프라인)에서, 목록을 dict로 접어 세는 방식은 fold-universality(fold의 보편성)에서 다룹니다.
