The answer is `90`. Writing down the intermediate value at each step gives:

```gleam
[1, 2, 3, 4, 5]
|> list.filter(fn(x) { x % 2 == 1 })   // [1, 3, 5]
|> list.map(fn(x) { x * 10 })          // [10, 30, 50]
|> list.fold(0, fn(acc, x) { acc + x }) // 0 + 10 + 30 + 50 = 90
```

Each step of a pipeline is a pure function that takes only the result of the previous step and returns a new value. So you do not have to hold the whole thing in your head at once; you can write down "input → output" one step at a time (theory topic "Function composition and pipelines"). What makes this kind of reading possible is that you can replace any step with its result value without changing the meaning (theory topic "Referential transparency").

A common mistake is to read the `filter` condition backwards and keep the even numbers (`[2, 4]`). In that case the answer becomes 60. `x % 2 == 1` means "keep the odd numbers".
