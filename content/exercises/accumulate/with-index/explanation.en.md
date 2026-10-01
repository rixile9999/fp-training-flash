The public function `accumulate_indexed(list, fun)` has no place to hold "which element am I on right now". So you add a helper `go` that takes the position and the result accumulator as arguments, and the public function only sets the starting state (position 0, empty accumulator) and calls it.

```gleam
fn go(items, fun, index, acc) {
  case items {
    [] -> list.reverse(acc)
    [first, ..rest] -> go(rest, fun, index + 1, [fun(first, index), ..acc])
  }
}
```

Each recursive call handles exactly one element, so `index + 1` is precisely the position of the next element. Because the results are stacked in front of `acc`, you reverse once at the end to restore the original order. Tail recursion like this, where the recursive call is the last thing that happens, does not grow the call stack. Carrying the state you need along in the arguments is covered in the theory note accumulators-and-tail-recursion (Accumulators and tail recursion).

There are two common mistakes.

- Starting the position at 1: every number is shifted by one. If you need numbering for people to read, use `i + 1` on the caller's side.
- Leaving out `list.reverse`: the result comes out reversed.

Because it preserves the length and order of the input, this function has the same property as the map in "Structure-preserving transformations: functors". The position is just extra information passed to the transformation function.
