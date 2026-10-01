A list is either the empty list `[]` or "a first element and the rest of the list" `[first, ..rest]`. Split those two cases and the answer falls right out.

```gleam
case list {
  [] -> []
  [first, ..rest] -> [fun(first), ..accumulate(rest, fun)]
}
```

- Transforming an empty list gives an empty list.
- Put the transformed first element at the front, and append the rest, transformed by the same function, after it.

It keeps the shape of the input (the number and order of elements) and changes only the elements, so this is the map described in the theory note "Structure-preserving transformations: functors". The recursion walks down the structure of the list one step at a time, so it always terminates. That property is covered in the theory note structural-recursion-induction (Structural recursion and induction).

A common mistake is to switch to tail recursion with an accumulator, prepend with `[fun(first), ..acc]`, and forget to reverse at the end. Then `[1, 2, 3]` becomes `[9, 4, 1]`. If you use an accumulator, you have to call `list.reverse(acc)` once at the end. This pattern is covered in the theory note accumulators-and-tail-recursion (Accumulators and tail recursion).
