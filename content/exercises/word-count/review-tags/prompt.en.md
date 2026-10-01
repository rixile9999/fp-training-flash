In a delivery app, customers leave comma-separated tags with each review (e.g. `"Fast, friendly"`). You want to count, for each tag, **the number of reviews that have that tag**. Write two functions.

1. `tags_of(review)`: returns the list of tags for one review.
   - Split on commas `,`.
   - Remove the leading and trailing spaces of each tag and convert it to lowercase.
   - If the cleaned-up result is an empty string, drop it.
   - If the same tag appears several times after cleanup, keep only the first one. The order is the order of first appearance.
2. `count_tags(reviews)`: returns the number of reviews per tag across all reviews as a `Dict(String, Int)`. Even if a review has the same tag several times, it counts as 1.

```gleam
tags_of(" Quiet ,friendly, quiet")
// -> ["quiet", "friendly"]
count_tags(["fast,fast,clean", "Clean"])
// -> dict.from_list([#("fast", 1), #("clean", 2)])
```
