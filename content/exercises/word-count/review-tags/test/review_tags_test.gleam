import gleam/dict
import gleeunit/should
import review_tags.{count_tags, tags_of}

pub fn tags_of_single_review_test() {
  tags_of("quiet,fast,cozy")
  |> should.equal(["quiet", "fast", "cozy"])
}

pub fn counts_across_reviews_test() {
  count_tags(["fast,friendly", "fast", "cheap"])
  |> should.equal(
    dict.from_list([#("fast", 2), #("friendly", 1), #("cheap", 1)]),
  )
}

pub fn normalizes_spaces_and_case_test() {
  count_tags([" Fast ,CHEAP", "fast"])
  |> should.equal(dict.from_list([#("fast", 2), #("cheap", 1)]))
}

pub fn duplicate_tag_in_one_review_counts_once_test() {
  count_tags(["fast,fast,clean", "clean"])
  |> should.equal(dict.from_list([#("fast", 1), #("clean", 2)]))
}

pub fn duplicates_after_normalizing_count_once_test() {
  tags_of("Fast, fast ,FAST")
  |> should.equal(["fast"])
}

pub fn skips_blank_tags_test() {
  count_tags(["fast,, ,", ""])
  |> should.equal(dict.from_list([#("fast", 1)]))
}

pub fn no_reviews_test() {
  count_tags([])
  |> should.equal(dict.new())
}
