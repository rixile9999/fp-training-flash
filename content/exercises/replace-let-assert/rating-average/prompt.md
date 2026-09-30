상품 페이지에 리뷰 평균을 보여 주는 `average_rating`이 있습니다. 리뷰가 아직 없는 상품에서는 `panic`으로, 잘못 저장된 평점이 섞이면 `let assert`로 프로세스가 죽습니다. 상품 페이지 하나 때문에 요청 처리가 멈추면 안 됩니다.

`panic`과 `let assert`를 없애고, 문제를 `RatingError` 값으로 반환하도록 고치세요.

```gleam
pub type RatingError {
  NoRatings
  OutOfRange(Int)
}

pub fn average_rating(ratings: List(Int)) -> Result(Float, RatingError)
```

- 평점 목록이 비어 있으면 `Error(NoRatings)`.
- 올바른 평점은 1 이상 5 이하다. 벗어난 평점이 있으면 `Error(OutOfRange(그 평점))`. 여럿이면 목록에서 가장 앞의 것을 알린다.
- 모두 올바르면 평균을 `Float`로 반환한다(지금과 같다).

```gleam
average_rating([4, 5])     // -> Ok(4.5)
average_rating([3, 7])     // 지금: 크래시   고친 뒤: Error(OutOfRange(7))
```
