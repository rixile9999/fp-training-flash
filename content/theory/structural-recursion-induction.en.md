---
id: structural-recursion-induction
title: Structural recursion and induction
---
The shape of a recursive function comes from the definition of the data type. A Gleam list is either the empty list `[]` or an item followed by the rest of the list, `[x, ..rest]`. So a function that processes a list has one branch for each of these two cases, and it recurses only on the **smaller part**, `rest`. That is structural recursion.

```gleam
pub fn total(xs: List(Int)) -> Int {
  case xs {
    [] -> 0
    [x, ..rest] -> x + total(rest)
  }
}
```

This shape gives you two guarantees.

- **Termination**: every call makes the list one cell shorter, and lists are finite, so you eventually reach the `[]` branch.
- **Correctness**: you can reason about it with the same structure as mathematical induction. Check that the answer for `[]` is right (the base step). Then **assume** that `total(rest)` correctly returns the sum of `rest`, and check that `x + total(rest)` is then the sum of the whole list (the inductive step). If both steps hold, the function is right for every list.

That's why you don't need to unfold every call in your head when you write a recursive function. You only need to answer: "If I already had the answer for the rest, what do I do with the current cell?"

If a type has several branches, you make several recursive calls. In a tree, the left and right subtrees are both smaller structures, so you recurse on both.

```gleam
pub type Tree {
  Leaf
  Node(left: Tree, value: Int, right: Tree)
}

pub fn size(tree: Tree) -> Int {
  case tree {
    Leaf -> 0
    Node(left, _, right) -> size(left) + 1 + size(right)
  }
}
```

There are three common mistakes. First, getting the base value wrong (such as making the sum of the empty list 1). The compiler catches a missing `[]` branch, but not a wrong value. Second, recursing on a value that doesn't get smaller. Calling again with the same list, or letting an integer skip past the base value and keep decreasing, never ends. Third, handling special cases such as `[x]` separately when you don't need to, so the rules in different branches drift apart. When you recurse on an integer `n`, `n - 1` must be "a smaller natural number", so rule out negative input first.

The `total` above isn't tail-recursive, because an addition is left after the recursive call. On the BEAM the stack doesn't overflow at a fixed size but grows as needed; still, it uses memory proportional to the input length. For long inputs, you can switch to tail recursion with an accumulator (see Accumulators and tail recursion).

## Where this concept is used

- Designing functions that process lists, trees and your own recursive types, with one branch per constructor.
- Checking that a recursive function is correct by reasoning about the base step and the inductive step separately.
- Fold is the abstraction of the common shape of structural recursion (see The universality of fold).
