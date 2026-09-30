import gleam/dict
import gleam/list
import gleeunit/should
import legacy.{to_legacy}

pub fn single_letter_test() {
  to_legacy(dict.from_list([#("a", 1)]))
  |> should.equal(dict.from_list([#(1, ["A"])]))
}

pub fn letters_with_same_score_are_grouped_test() {
  to_legacy(dict.from_list([#("a", 1), #("e", 1)]))
  |> should.equal(dict.from_list([#(1, ["A", "E"])]))
}

pub fn several_scores_test() {
  to_legacy(dict.from_list([#("d", 2), #("a", 1), #("g", 2)]))
  |> should.equal(dict.from_list([#(1, ["A"]), #(2, ["D", "G"])]))
}

pub fn empty_table_test() {
  to_legacy(dict.new())
  |> should.equal(dict.new())
}

pub fn group_is_sorted_alphabetically_test() {
  to_legacy(dict.from_list([#("t", 1), #("s", 1), #("r", 1), #("a", 1)]))
  |> should.equal(dict.from_list([#(1, ["A", "R", "S", "T"])]))
}

pub fn full_table_test() {
  to_legacy(
    dict.from_list([
      #("a", 1), #("b", 3), #("c", 3), #("d", 2), #("e", 1), #("f", 4),
      #("g", 2), #("h", 4), #("i", 1), #("j", 8), #("k", 5), #("l", 1),
      #("m", 3), #("n", 1), #("o", 1), #("p", 3), #("q", 10), #("r", 1),
      #("s", 1), #("t", 1), #("u", 1), #("v", 4), #("w", 4), #("x", 8),
      #("y", 4), #("z", 10),
    ]),
  )
  |> should.equal(
    dict.from_list([
      #(1, ["A", "E", "I", "L", "N", "O", "R", "S", "T", "U"]),
      #(2, ["D", "G"]),
      #(3, ["B", "C", "M", "P"]),
      #(4, ["F", "H", "V", "W", "Y"]),
      #(5, ["K"]),
      #(8, ["J", "X"]),
      #(10, ["Q", "Z"]),
    ]),
  )
}

pub fn large_table_is_sorted_test() {
  let letters = [
    #("a", 1), #("b", 3), #("c", 3), #("d", 2), #("e", 1), #("f", 4),
    #("g", 2), #("h", 4), #("i", 1), #("j", 8), #("k", 5), #("l", 1),
    #("m", 3), #("n", 1), #("o", 1), #("p", 3), #("q", 10), #("r", 1),
    #("s", 1), #("t", 1), #("u", 1), #("v", 4), #("w", 4), #("x", 8),
    #("y", 4), #("z", 10),
  ]
  let digraphs = [
    #("ch", 5), #("ll", 8), #("rr", 8), #("ng", 3), #("qu", 10),
    #("th", 4), #("sh", 4), #("ph", 5), #("ck", 5), #("dd", 3),
  ]
  to_legacy(dict.from_list(list.append(letters, digraphs)))
  |> should.equal(
    dict.from_list([
      #(1, ["A", "E", "I", "L", "N", "O", "R", "S", "T", "U"]),
      #(2, ["D", "G"]),
      #(3, ["B", "C", "DD", "M", "NG", "P"]),
      #(4, ["F", "H", "SH", "TH", "V", "W", "Y"]),
      #(5, ["CH", "CK", "K", "PH"]),
      #(8, ["J", "LL", "RR", "X"]),
      #(10, ["Q", "QU", "Z"]),
    ]),
  )
}
