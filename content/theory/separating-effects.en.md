---
id: separating-effects
title: Separating computation from effects
---
In the end, a program has to interact with the outside world. It prints to the screen, reads files, checks the current time and sends messages to other processes. These are called **effects**. Effects themselves aren't bad. The trouble starts when they get mixed into the middle of a computation.

Gleam doesn't mark effects in types. From the signature `fn(List(Item)) -> Nil` alone, you can't tell what a function prints, and a test can only check the return value `Nil`. So the separation is done through the **structure** of the code.

- **Pure core**: decides what to do and returns that decision as **data**. The lines to print, the records to save and the messages to send are built as values.
- **Thin shell**: takes the data from the core and performs the actual effects. It has almost no branching or computation.

```gleam
import gleam/int
import gleam/io
import gleam/list

pub type Item {
  Item(name: String, stock: Int)
}

pub fn low_stock_warnings(items: List(Item), threshold: Int) -> List(String) {
  items
  |> list.filter(fn(item) { item.stock < threshold })
  |> list.map(fn(item) {
    item.name <> ": " <> int.to_string(item.stock) <> " left in stock"
  })
}

pub fn report(items: List(Item)) -> Nil {
  low_stock_warnings(items, 5)
  |> list.each(io.println)
}
```

`low_stock_warnings` is pure, so you test it by comparing the result directly, as in `should.equal(["Apple: 3 left in stock"])`. Every rule about the threshold, the wording and the order lives here. `report` is two lines of glue code, so there's almost no room for it to be wrong.

## Move input effects out too

Effects that **read**, such as the current time, random numbers and the contents of a configuration file, are the same. Don't read the time directly inside a calculation function; take it as an argument. `is_expired(coupon, now)` can be tested with any time you like, but an `is_expired(coupon)` that reads the time inside may give a different result on every run.

## Why split things this way

- **Testing**: the core is verified by comparing values, and its results are the same on every run.
- **Reuse**: the same list of warnings can be printed to the console, written to a file or sent as a response body. The core doesn't change.
- **Reasoning**: the core's functions are referentially transparent, so you can split and combine them freely (see Referential transparency).

Common mistakes are calling `io.println` in the middle of a computation, returning only `Nil` instead of a result so you can't check what was done, and reading the time or configuration directly deep inside the core.

## Where this concept is used

- Splitting features that need output, such as logs, reports and notifications, into "a function that builds what to output" and "a function that outputs it".
- Making rules that depend on the time, random numbers or configuration testable by taking those as arguments.
- Refactoring a long function with mixed-in effects into pure steps and effect steps.
