import gleam/dict
import gleeunit/should
import shelf_index.{index_by_code}

pub fn single_code_test() {
  index_by_code(dict.from_list([#("A1", ["ab-12"])]))
  |> should.equal(dict.from_list([#("AB-12", "A1")]))
}

pub fn several_shelves_test() {
  index_by_code(
    dict.from_list([#("A1", ["ab-12", "cd-34"]), #("B2", ["EF-56"])]),
  )
  |> should.equal(
    dict.from_list([#("AB-12", "A1"), #("CD-34", "A1"), #("EF-56", "B2")]),
  )
}

pub fn trims_spaces_test() {
  index_by_code(dict.from_list([#("C3", ["  gh-78 "])]))
  |> should.equal(dict.from_list([#("GH-78", "C3")]))
}

pub fn skips_blank_codes_test() {
  index_by_code(dict.from_list([#("A1", ["   ", "xy-1", ""])]))
  |> should.equal(dict.from_list([#("XY-1", "A1")]))
}

pub fn shelf_without_codes_adds_nothing_test() {
  index_by_code(dict.from_list([#("A1", []), #("B2", ["k-9"])]))
  |> should.equal(dict.from_list([#("K-9", "B2")]))
}

pub fn empty_input_test() {
  index_by_code(dict.new())
  |> should.equal(dict.new())
}

pub fn shelf_name_is_kept_as_is_test() {
  index_by_code(dict.from_list([#("cold-a ", ["mk-1"])]))
  |> should.equal(dict.from_list([#("MK-1", "cold-a ")]))
}
