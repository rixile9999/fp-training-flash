The answer is `[8, 7, 6]`.

The function capture `f(a, _)` is shorthand for `fn(x) { f(a, x) }`. The element goes where the `_` is.

```gleam
[1, 2, 3]
|> list.map(int.subtract(10, _))  // fn(x) { 10 - x } -> [9, 8, 7]
|> list.map(int.subtract(_, 1))   // fn(x) { x - 1 }  -> [8, 7, 6]
```

Even with the same `int.subtract`, the meaning changes with the position of `_`: "subtract from 10" versus "subtract 1". A common mistake is to read both captures as `x - 10` and `x - 1` and answer `[-10, -9, -8]`. A pipe (`x |> f(a)`) always puts the value into the first argument, but with a capture you choose the position yourself. Captures are the tool for lining up argument order when you build a pipeline out of small functions (theory topic "Function composition and pipelines").
