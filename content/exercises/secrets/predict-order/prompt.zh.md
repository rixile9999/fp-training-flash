已经定义了下面这些函数。

```gleam
pub fn secret_add(secret: Int) -> fn(Int) -> Int {
  fn(x) { x + secret }
}

pub fn secret_multiply(secret: Int) -> fn(Int) -> Int {
  fn(x) { x * secret }
}

pub fn secret_combine(
  secret_function1: fn(Int) -> Int,
  secret_function2: fn(Int) -> Int,
) -> fn(Int) -> Int {
  fn(x) { secret_function2(secret_function1(x)) }
}
```

请用 Gleam 的值写法写出下面代码最后一个表达式返回的值。（例如 `#(1, 2)`）

```gleam
let add3 = secret_add(3)
let double = secret_multiply(2)
let f = secret_combine(add3, double)
let g = secret_combine(double, add3)
#(f(5), g(5))
```
