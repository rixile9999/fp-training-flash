`average_rating` shows the average review score on a product page. For a product with no reviews yet, the process dies on `panic`, and when a wrongly stored rating slips in, it dies on `let assert`. A single product page must not bring request handling to a halt.

Remove the `panic` and the `let assert` and fix the function so that problems are returned as `RatingError` values.

```gleam
pub type RatingError {
  NoRatings
  OutOfRange(Int)
}

pub fn average_rating(ratings: List(Int)) -> Result(Float, RatingError)
```

- If the list of ratings is empty, `Error(NoRatings)`.
- A valid rating is at least 1 and at most 5. If a rating is outside that range, `Error(OutOfRange(that rating))`. If there are several, report the first one in the list.
- If all ratings are valid, return the average as a `Float` (same as now).

```gleam
average_rating([4, 5])     // -> Ok(4.5)
average_rating([3, 7])     // now: crash   after the fix: Error(OutOfRange(7))
```
