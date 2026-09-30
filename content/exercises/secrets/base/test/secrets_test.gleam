import gleeunit/should
import secrets.{
  secret_add, secret_combine, secret_divide, secret_multiply, secret_subtract,
}

pub fn add_test() {
  let add = secret_add(3)
  add(6)
  |> should.equal(9)
}

pub fn subtract_test() {
  let subtract = secret_subtract(3)
  subtract(10)
  |> should.equal(7)
}

pub fn subtract_goes_negative_test() {
  let subtract = secret_subtract(6)
  subtract(3)
  |> should.equal(-3)
}

pub fn multiply_test() {
  let multiply = secret_multiply(7)
  multiply(3)
  |> should.equal(21)
}

pub fn divide_test() {
  let divide = secret_divide(3)
  divide(32)
  |> should.equal(10)
}

pub fn divide_operand_order_test() {
  let divide = secret_divide(6)
  divide(7)
  |> should.equal(1)
}

pub fn combine_test() {
  let combined = secret_combine(secret_multiply(7), secret_divide(3))
  combined(6)
  |> should.equal(14)
}

pub fn combine_order_test() {
  let combined = secret_combine(secret_add(3), secret_divide(7))
  combined(4)
  |> should.equal(1)
}
