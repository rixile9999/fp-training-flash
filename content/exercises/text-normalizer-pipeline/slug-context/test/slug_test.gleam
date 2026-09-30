import gleeunit/should
import slug.{clean_word, short_slug, slugify, to_words}

pub fn clean_word_test() {
  clean_word("(5KG)")
  |> should.equal("5kg")
}

pub fn to_words_test() {
  to_words("Fresh Apples (5kg)")
  |> should.equal(["fresh", "apples", "5kg"])
}

pub fn to_words_drops_symbol_only_test() {
  to_words("tea - & - cup")
  |> should.equal(["tea", "cup"])
}

pub fn to_words_multiple_spaces_test() {
  to_words("  big   box ")
  |> should.equal(["big", "box"])
}

pub fn slugify_test() {
  slugify("Fresh Apples (5kg) - SALE!")
  |> should.equal("fresh-apples-5kg-sale")
}

pub fn short_slug_test() {
  short_slug("Fresh Apples (5kg) - SALE!", 2)
  |> should.equal("fresh-apples")
}

pub fn short_slug_skips_symbol_words_test() {
  short_slug("New - Arrival & Best Seller", 3)
  |> should.equal("new-arrival-best")
}
