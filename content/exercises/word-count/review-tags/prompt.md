배달 앱의 리뷰마다 손님이 쉼표로 구분한 태그를 남깁니다(예: `"Fast, friendly"`). 태그별로 **그 태그가 달린 리뷰 수**를 세려고 합니다. 두 함수를 작성하세요.

1. `tags_of(review)`: 리뷰 한 건의 태그 목록을 반환한다.
   - 쉼표 `,`로 나눈다.
   - 각 태그의 앞뒤 공백을 없애고 소문자로 바꾼다.
   - 정리한 결과가 빈 문자열이면 버린다.
   - 정리한 뒤 같은 태그가 여러 번 나오면 처음 나온 하나만 남긴다. 순서는 처음 나온 순서다.
2. `count_tags(reviews)`: 모든 리뷰에 대해 태그별 리뷰 수를 `Dict(String, Int)`로 반환한다. 한 리뷰에 같은 태그가 여러 번 있어도 1로 센다.

```gleam
tags_of(" Quiet ,friendly, quiet")
// -> ["quiet", "friendly"]
count_tags(["fast,fast,clean", "Clean"])
// -> dict.from_list([#("fast", 1), #("clean", 2)])
```
