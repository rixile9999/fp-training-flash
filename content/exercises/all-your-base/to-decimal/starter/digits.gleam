pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn from_digits(digits: List(Int), base: Int) -> Result(Int, RebaseError) {
  todo
}
