pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}

pub fn clean(input: String) -> Result(String, PhoneError) {
  todo
}
