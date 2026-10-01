---
id: function-composition-pipelines
title: Function composition and pipelines
---
Given functions `f: a -> b` and `g: b -> c`, you can build a new function `a -> c` that applies `f` first and then applies `g` to the result. That is **function composition**, the most basic way to express a big transformation as a sequence of small ones.

Gleam's pipe operator `|>` lets you write composition in the order data flows. `x |> f |> g` is the same as `g(f(x))`. The value on the left goes in as the **first argument** of the function on the right; with a function capture such as `f(a, _)`, you can put it in another position.

```gleam
import gleam/list
import gleam/string

pub fn normalize(tag: String) -> String {
  tag |> string.trim |> string.lowercase
}

pub fn parse_tags(raw: String) -> List(String) {
  raw
  |> string.split(",")
  |> list.map(normalize)
  |> list.filter(fn(tag) { tag != "" })
}
```

`parse_tags(" Gleam, FP ,,beam ")` is `["gleam", "fp", "beam"]`. Each step does one thing, and reading the names alone shows you the whole flow.

## Why it splits apart so well

- **Types are the glue**: steps connect only if one step's output type matches the next step's input type. Slot in a step wrongly and the compiler tells you.
- **Associativity**: composition gives the same result however you group it. So you can bundle the two steps `trim` and `lowercase` under the name `normalize`, or unbundle them again, without changing the meaning. That's what lets you split a pipeline into testable pieces.
- **Each step is checked on its own**: test `normalize` by itself, and for `parse_tags` you only need to check that the steps are wired together.

The `gleam/function` module in gleam_stdlib 1.0.5, which this platform uses, has only `identity` and no composition function. But functions are values, so it's easy to write one yourself.

```gleam
pub fn compose(f: fn(a) -> b, g: fn(b) -> c) -> fn(a) -> c {
  fn(x) { g(f(x)) }
}
```

## Things to watch out for

- **Order can change the meaning**: composition is not commutative. If you filter out empty tags first and then trim whitespace, a tag like `" "` passes the filter, becomes an empty string, and stays in the result. Check what input each step assumes, then decide the order.
- **One thing per step**: if a step both parses and filters, it's hard to name and hard to reuse.
- **Effects at the end**: if a middle step prints output, merging or moving steps changes how many times and in what order the effect happens. Chain pure steps and perform the effect once at the end of the pipeline.
- **Data as the first parameter**: if functions you write also take the data to process as their first parameter, they slot naturally into a pipe.

## Where this concept is used

- Multi-step transformations such as normalizing strings, cleaning input and generating reports.
- Refactoring a long function into named steps and reconnecting them as a pipeline.
- Following each step's input and output in turn when predicting the result of a pipeline.
