import gleeunit/should
import signup.{
  InvalidEmail, NewUser, PasswordTooShort, SignupForm, Underage,
  UsernameTooShort, validate,
}

pub fn valid_form_test() {
  SignupForm("mina", "mina@example.com", "s3cret-pw", 20)
  |> validate
  |> should.equal(Ok(NewUser("mina", "mina@example.com", 20)))
}

pub fn short_username_test() {
  SignupForm("mi", "mina@example.com", "s3cret-pw", 20)
  |> validate
  |> should.equal(Error(UsernameTooShort))
}

pub fn invalid_email_test() {
  SignupForm("mina", "mina.example.com", "s3cret-pw", 20)
  |> validate
  |> should.equal(Error(InvalidEmail))
}

pub fn short_password_test() {
  SignupForm("mina", "mina@example.com", "1234", 20)
  |> validate
  |> should.equal(Error(PasswordTooShort))
}

pub fn underage_test() {
  SignupForm("mina", "mina@example.com", "s3cret-pw", 13)
  |> validate
  |> should.equal(Error(Underage))
}

pub fn first_error_in_field_order_test() {
  SignupForm("mi", "mina.example.com", "1234", 10)
  |> validate
  |> should.equal(Error(UsernameTooShort))
  SignupForm("mina", "mina.example.com", "1234", 10)
  |> validate
  |> should.equal(Error(InvalidEmail))
  SignupForm("mina", "mina@example.com", "1234", 10)
  |> validate
  |> should.equal(Error(PasswordTooShort))
}
