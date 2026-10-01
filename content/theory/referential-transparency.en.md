---
id: referential-transparency
title: 'Referential transparency: when you can replace an expression with its value'
---
An expression is **referentially transparent** if replacing it with its value doesn't change the meaning of the program. For a function call to be referentially transparent, its result must depend only on its arguments, and the call must not do anything observable from outside other than produce the result (printing, writing a file, sending a message, changing global state). Such a function is called a pure function.

```gleam
pub fn line_total(price: Int, quantity: Int) -> Int {
  price * quantity
}

pub fn doubled() -> Int {
  let t = line_total(1200, 3)
  t + t
}
```

In `doubled`, you can replace `t` with `line_total(1200, 3)`, or conversely bind `line_total(1200, 3) + line_total(1200, 3)` with `let`, and the result is 7200 either way. You can work with code the way you substitute equals for equals in mathematics (equational reasoning).

## Gleam doesn't enforce purity

Unlike Haskell, Gleam doesn't track effects in types. Any function can call `io.println`, send a message to another process, or read the current time through an external function. Having the same signature as a pure function doesn't make a function pure.

```gleam
import gleam/io

pub fn noisy_total(price: Int, quantity: Int) -> Int {
  io.println("Calculating")
  price * quantity
}
```

Compute `t + t` after `let t = noisy_total(1200, 3)` and it prints once; `noisy_total(1200, 3) + noisy_total(1200, 3)` prints twice. The return value is the same, but the observable behavior differs, so this call is not referentially transparent. A function that reads the current time or a random number returns different results even when called with the same arguments. So in Gleam, referential transparency is a property you maintain through **design**, not through the compiler.

## Why it's worth keeping

- **Extracting functions is safe**: you can pull out part of a long function and give it a name, or bind a repeated expression to a single variable, without changing the meaning. It's a precondition for refactoring by function decomposition.
- **Tests are simple**: give an input and compare the result with `should.equal`. No fake objects or output capturing needed.
- **Order and count are free to change**: you can cache results, reorder computations, or remove unnecessary calls.

A common mistake is to print a log or read the current time directly in the middle of a computation, creating a function that looks like a calculation but can't be tested. Take such values as arguments, and return what should be printed as data (see Separating computation from effects).

## Where this concept is used

- When splitting a long function into smaller ones, first check that each piece is pure.
- Designing tests where the same arguments must produce the same result.
- Working out how many times and in what order effectful calls happen when predicting what code will print.
