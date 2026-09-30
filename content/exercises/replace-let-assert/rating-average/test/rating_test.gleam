import gleeunit/should
import rating.{NoRatings, OutOfRange, average_rating}

pub fn average_of_ratings_test() {
  average_rating([4, 5])
  |> should.equal(Ok(4.5))
}

pub fn empty_ratings_is_error_test() {
  average_rating([])
  |> should.equal(Error(NoRatings))
}

pub fn rating_above_five_is_error_test() {
  average_rating([3, 7])
  |> should.equal(Error(OutOfRange(7)))
}

pub fn rating_zero_is_error_test() {
  average_rating([0, 5])
  |> should.equal(Error(OutOfRange(0)))
}

pub fn boundary_ratings_are_valid_test() {
  average_rating([1, 5])
  |> should.equal(Ok(3.0))
}

pub fn first_out_of_range_rating_test() {
  average_rating([5, 9, -1])
  |> should.equal(Error(OutOfRange(9)))
}
