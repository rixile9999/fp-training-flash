import gleam/list

pub fn secret_add(secret: Int) -> fn(Int) -> Int {
  fn(x) { x + secret }
}

pub fn secret_subtract(secret: Int) -> fn(Int) -> Int {
  fn(x) { x - secret }
}

pub fn secret_multiply(secret: Int) -> fn(Int) -> Int {
  fn(x) { x * secret }
}

pub fn secret_divide(secret: Int) -> fn(Int) -> Int {
  fn(x) { x / secret }
}

pub fn secret_combine(
  secret_function1: fn(Int) -> Int,
  secret_function2: fn(Int) -> Int,
) -> fn(Int) -> Int {
  fn(x) { secret_function2(secret_function1(x)) }
}

pub fn secret_combine_all(fns: List(fn(Int) -> Int)) -> fn(Int) -> Int {
  list.fold(fns, fn(x) { x }, secret_combine)
}

pub fn secret_repeat(f: fn(Int) -> Int, times: Int) -> fn(Int) -> Int {
  list.repeat(f, times)
  |> secret_combine_all
}
