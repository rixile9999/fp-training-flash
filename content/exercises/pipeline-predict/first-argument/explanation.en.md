The answer is `14`.

In Gleam, the pipe `a |> f(b)` becomes `f(a, b)`. The value on the left goes into the **first argument** of the function on the right. So the code above is the same as:

```gleam
int.multiply(int.subtract(10, 3), 2)
// int.subtract(10, 3) = 10 - 3 = 7
// int.multiply(7, 2)  = 14
```

A common mistake is to think the piped value goes into the last argument and compute `int.subtract(3, 10) = -7` (answer -14). This confusion comes from habits formed by pipes or currying in other languages. Most Gleam standard library functions take "the value they mainly work on" as the first argument, so calls chain naturally, as in `list |> list.map(f)`. When you want to put the value somewhere other than the first argument, mark the position with `_`, as in `int.subtract(100, _)` (theory topic "Function composition and pipelines").
