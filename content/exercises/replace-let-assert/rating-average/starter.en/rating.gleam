import gleam/int
import gleam/list

pub type RatingError {
  NoRatings
  OutOfRange(Int)
}

/// Computes the average of product review ratings (1–5).
pub fn average_rating(ratings: List(Int)) -> Result(Float, RatingError) {
  case ratings {
    [] -> panic as "평점이 없습니다"
    _ -> {
      let assert True =
        list.all(ratings, fn(rating) { rating >= 1 && rating <= 5 })
      let total = int.sum(ratings)
      Ok(int.to_float(total) /. int.to_float(list.length(ratings)))
    }
  }
}
