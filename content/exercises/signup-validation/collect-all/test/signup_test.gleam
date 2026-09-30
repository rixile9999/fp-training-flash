import gleeunit/should
import signup.{
  InvalidEmail, NewUser, PasswordTooShort, SignupForm, Underage,
  UsernameTooShort, validate_all,
}

pub fn valid_form_test() {
  SignupForm("mina", "mina@example.com", "s3cret-pw", 20)
  |> validate_all
  |> should.equal(Ok(NewUser("mina", "mina@example.com", 20)))
}

pub fn single_error_is_a_list_test() {
  SignupForm("mina", "mina@example.com", "1234", 20)
  |> validate_all
  |> should.equal(Error([PasswordTooShort]))
}

pub fn collects_two_errors_test() {
  SignupForm("mi", "mina@example.com", "s3cret-pw", 12)
  |> validate_all
  |> should.equal(Error([UsernameTooShort, Underage]))
}

pub fn all_four_errors_in_field_order_test() {
  SignupForm("", "nope", "pw", 0)
  |> validate_all
  |> should.equal(
    Error([UsernameTooShort, InvalidEmail, PasswordTooShort, Underage]),
  )
}

pub fn email_and_password_errors_test() {
  SignupForm("mina", "mina.example.com", "short", 30)
  |> validate_all
  |> should.equal(Error([InvalidEmail, PasswordTooShort]))
}

pub fn only_age_error_test() {
  SignupForm("mina", "mina@example.com", "s3cret-pw", 13)
  |> validate_all
  |> should.equal(Error([Underage]))
}
