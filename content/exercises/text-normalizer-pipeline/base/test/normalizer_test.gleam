import gleeunit/should
import normalizer.{collapse_spaces, normalize, strip_punctuation}

pub fn strip_punctuation_test() {
  strip_punctuation("Hi, there! Ok?")
  |> should.equal("Hi there Ok")
}

pub fn collapse_spaces_test() {
  collapse_spaces("a   b  c")
  |> should.equal("a b c")
}

pub fn collapse_spaces_edges_test() {
  collapse_spaces("  a b  ")
  |> should.equal("a b")
}

pub fn normalize_test() {
  normalize("  Hello,   World!! ")
  |> should.equal("hello world")
}

pub fn normalize_punctuation_between_spaces_test() {
  normalize("Wait , what ?")
  |> should.equal("wait what")
}

pub fn normalize_trims_tabs_newlines_test() {
  normalize("\tGleam\n")
  |> should.equal("gleam")
}
