If you separate "handling one review" from "the overall tally", each part becomes simple.

```gleam
pub fn tags_of(review: String) -> List(String) {
  review
  |> string.split(",")
  |> list.map(normalize)                 // trim spaces + lowercase
  |> list.filter(fn(tag) { tag != "" })  // drop empty tags
  |> list.unique                         // remove duplicates within the review
}

pub fn count_tags(reviews: List(String)) -> Dict(String, Int) {
  reviews
  |> list.flat_map(tags_of)
  |> list.fold(dict.new(), increment)
}
```

What you're counting is not "how many times a tag appears" but "how many reviews have the tag", so first remove duplicates per review, then join the tags of all reviews and count them. If you apply duplicate removal across all of `count_tags`, legitimate appearances spread over several reviews disappear too, so it must happen within a single review.

The order of the steps matters as well. `"Fast"` and `" fast"` are different strings before cleanup, so if you remove duplicates before cleaning up, both survive. Filtering out empty tags also has to come after cleanup so that a tag like `" "` can be dropped. Keeping the "clean up -> decide" order in the pipeline is the part people get wrong most often in this exercise.

If you use `set.from_list` and `set.to_list` to remove duplicates, the order of first appearance is lost. `tags_of` must keep the order, so use `list.unique`, which preserves it.

Composing small transformations in the right order is covered in the theory note function-composition-pipelines (Function composition and pipelines), and counting by folding a list into a dict is covered in fold-universality (The universality of fold).
