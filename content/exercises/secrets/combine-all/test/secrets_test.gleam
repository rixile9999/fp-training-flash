import gleeunit/should
import secrets.{
  secret_add, secret_combine_all, secret_multiply, secret_repeat,
  secret_subtract,
}

pub fn combine_all_test() {
  let f =
    secret_combine_all([secret_add(2), secret_multiply(10), secret_subtract(1)])
  f(1)
  |> should.equal(29)
}

pub fn combine_all_single_test() {
  let f = secret_combine_all([secret_multiply(3)])
  f(5)
  |> should.equal(15)
}

pub fn combine_all_empty_test() {
  let f = secret_combine_all([])
  f(42)
  |> should.equal(42)
}

pub fn repeat_test() {
  let f = secret_repeat(secret_multiply(2), 3)
  f(1)
  |> should.equal(8)
}

pub fn repeat_once_test() {
  let f = secret_repeat(secret_add(5), 1)
  f(7)
  |> should.equal(12)
}

pub fn repeat_zero_test() {
  let f = secret_repeat(secret_add(5), 0)
  f(7)
  |> should.equal(7)
}

pub fn repeat_negative_test() {
  let f = secret_repeat(secret_add(5), -2)
  f(7)
  |> should.equal(7)
}
