import gleam/int
import gleam/list

pub type RatingError {
  NoRatings
  OutOfRange(Int)
}

/// 상품 리뷰 평점(1~5)의 평균을 구한다.
pub fn average_rating(ratings: List(Int)) -> Result(Float, RatingError) {
  case ratings, list.find(ratings, is_out_of_range) {
    [], _ -> Error(NoRatings)
    _, Ok(bad) -> Error(OutOfRange(bad))
    _, Error(Nil) -> {
      let total = int.sum(ratings)
      Ok(int.to_float(total) /. int.to_float(list.length(ratings)))
    }
  }
}

fn is_out_of_range(rating: Int) -> Bool {
  rating < 1 || rating > 5
}
