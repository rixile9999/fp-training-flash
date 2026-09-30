import gleam/dict.{type Dict}

pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}

pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), CountError) {
  todo
}
