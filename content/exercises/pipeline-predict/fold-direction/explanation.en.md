The answer is `"cccbba"`.

```gleam
["a", "b", "c"]
|> list.index_map(fn(s, i) { string.repeat(s, i + 1) })  // ["a", "bb", "ccc"]
|> list.fold("", fn(acc, s) { s <> acc })
// acc: "" -> "a" -> "bba" -> "cccbba"
```

`list.fold` goes through the list **from the front**, but the function `s <> acc` attaches the new element **to the front** of the accumulator. So the later an element is seen, the closer to the front of the result it ends up. It is the same principle by which collecting into a list by prepending reverses the order. The direction of traversal (fold vs fold_right) and the direction of attaching (`s <> acc` vs `acc <> s`) are two separate choices, and the order of the result is determined by their combination (theory topic "The universality of fold").

There are two common mistakes: thinking that because fold goes from the front, the result also reads from the front, and answering `"abbccc"`; and mistaking the index of `index_map` as starting from 1, which adds one repetition to each piece, as in `"ccccbbbaa"`.
