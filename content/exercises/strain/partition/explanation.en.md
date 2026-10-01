There are two results, so there are two accumulators as well. For each element, compute the condition just once and stack the element onto one of the two accumulators; when the list ends, reverse each side and bundle them into a tuple.

```gleam
case items {
  [] -> #(list.reverse(kept), list.reverse(rejected))
  [first, ..rest] ->
    case predicate(first) {
      True -> go(rest, predicate, [first, ..kept], rejected)
      False -> go(rest, predicate, kept, [first, ..rejected])
    }
}
```

Calling `keep` and `discard` separately gives the same result, but it walks the list twice and also calls the condition function twice per element. When the condition is expensive or the list is large, the difference grows. Collecting several results in one pass is ultimately "a fold with two pieces of state", covered in the theory notes fold-universality (The universality of fold) and accumulators-and-tail-recursion (Accumulators and tail recursion).

There are two common mistakes:

- Reversing only one accumulator, so the other side comes out backwards.
- Swapping the tuple order and returning `#(false, true)`. The return type is `#(List(t), List(t))`, so the compiler can't catch this; you have to check it with tests.
