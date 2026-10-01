The cause is not in `with_vat` but in `go`, the helper of the shared function `accumulate`. `go` stacks each processed value **in front of** the accumulator with `[fun(first), ..acc]`. The first element goes in first and gets pushed furthest back, so the finished accumulator is in the reverse order of the input. That is why you have to reverse it once in the empty-list branch, where the accumulation ends.

```gleam
case items {
  [] -> list.reverse(acc)
  [first, ..rest] -> go(rest, fun, [fun(first), ..acc])
}
```

Prepending takes constant time and the final reverse happens only once, so the whole thing runs in linear time. Appending at the end with `list.append(acc, [x])` on every step would get the order right, but it copies the accumulator each time and becomes quadratic. This "prepend, then reverse at the end" pattern is covered in the theory note accumulators-and-tail-recursion (Accumulators and tail recursion).

A common mistake is to reverse the result with `list.reverse` only in `with_vat`, where the symptom showed up. One test passes, but every other place that uses `accumulate` still gets reversed results. `accumulate` is a function that promises to preserve order just like map ("Structure-preserving transformations: functors"), so you have to fix the place that broke that promise.
