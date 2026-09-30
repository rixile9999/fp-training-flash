import gleeunit/should
import team_signup.{
  InvalidEmail, NewUser, PasswordTooShort, SignupForm, Underage,
  UsernameTooShort, validate_team,
}

pub fn all_valid_team_test() {
  validate_team([
    SignupForm("mina", "mina@example.com", "s3cret-pw", 20),
    SignupForm("joon", "joon@example.com", "p4ssword!", 31),
  ])
  |> should.equal(
    Ok([
      NewUser("mina", "mina@example.com", 20),
      NewUser("joon", "joon@example.com", 31),
    ]),
  )
}

pub fn reports_invalid_member_with_number_test() {
  validate_team([
    SignupForm("mina", "mina@example.com", "s3cret-pw", 20),
    SignupForm("joon", "joon@example.com", "1234", 31),
  ])
  |> should.equal(Error([#(2, [PasswordTooShort])]))
}

pub fn empty_team_test() {
  validate_team([])
  |> should.equal(Ok([]))
}

pub fn keeps_member_order_test() {
  validate_team([
    SignupForm("cho", "cho@example.com", "s3cret-pw", 40),
    SignupForm("ahn", "ahn@example.com", "s3cret-pw", 25),
    SignupForm("bae", "bae@example.com", "s3cret-pw", 16),
  ])
  |> should.equal(
    Ok([
      NewUser("cho", "cho@example.com", 40),
      NewUser("ahn", "ahn@example.com", 25),
      NewUser("bae", "bae@example.com", 16),
    ]),
  )
}

pub fn reports_every_invalid_member_test() {
  validate_team([
    SignupForm("mi", "mina@example.com", "s3cret-pw", 20),
    SignupForm("joon", "joon@example.com", "p4ssword!", 31),
    SignupForm("seo", "seo.example.com", "pw", 12),
  ])
  |> should.equal(
    Error([
      #(1, [UsernameTooShort]),
      #(3, [InvalidEmail, PasswordTooShort, Underage]),
    ]),
  )
}

pub fn first_member_is_number_one_test() {
  validate_team([SignupForm("mina", "mina@example.com", "s3cret-pw", 9)])
  |> should.equal(Error([#(1, [Underage])]))
}
