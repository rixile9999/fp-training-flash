---
id: divide-and-conquer
title: Divide and conquer, and recurrences
---
Divide and conquer solves a problem in three steps.

1. **Divide**: split the input into smaller problems of the same kind.
2. **Conquer**: solve the smaller problems recursively.
3. **Combine**: build the answer to the original problem from the answers to the smaller ones.

You also need a **base case** that answers directly without dividing any further.

## Correctness: trust the answers to the smaller problems

The same inductive reasoning as in structural recursion applies. Assume the recursive calls return correct answers on smaller inputs, and you only need to check that the combine step is correct. For this reasoning to hold, two conditions are needed.

- The input of every recursive call must be **strictly** smaller.
- The base cases must cover **every** input that can't be divided further.

The second condition is the one people often miss in merge sort. Splitting a one-element list in half gives `[]` and `[x]`, and `[x]` is the same size as the original input. If `[]` is the only base case, the function recurses on the same input forever. That's why both `[]` and `[x]` are base cases.

## Example: exponentiation

Compute `base` to the power `exponent` by halving the exponent instead of multiplying `exponent` times. Assume `exponent` is 0 or greater.

```gleam
pub fn power(base: Int, exponent: Int) -> Int {
  case exponent {
    0 -> 1
    _ -> {
      let half = power(base, exponent / 2)
      case exponent % 2 {
        0 -> half * half
        _ -> half * half * base
      }
    }
  }
}
```

Call the exponent n. There is only one recursive call and n halves each time, so it takes O(log n) multiplications. If instead of binding `half` with `let` you write `power(base, exponent / 2) * power(base, exponent / 2)`, the result is the same, but the calls branch in two and it takes O(n) multiplications. Everything you gained by dividing is lost to solving the same subproblem twice.

## Cost: count it with a recurrence

Write the cost T(n) of a problem of size n as "the cost of the smaller problems + the cost of dividing and combining".

| Recurrence | Example | Result |
|---|---|---|
| T(n) = T(n/2) + O(1) | exponentiation, descending one side of a balanced tree | O(log n) |
| T(n) = 2T(n/2) + O(1) | visiting every node of a balanced tree | O(n) |
| T(n) = 2T(n/2) + O(n) | merge sort | O(n log n) |
| T(n) = T(n-1) + O(n) | a split into 1 element and the rest every time | O(n²) |

Draw the recursion tree for merge sort and you can see why. The size halves at each level, so the depth is log₂ n, and the elements merged across each level add up to n. That's O(n) per level over log n levels, so O(n log n).

Splitting a list in half takes O(n), because you count the length and copy the first half. The combine step is already O(n), so the overall order doesn't change. On the other hand, if the split is lopsided, the depth becomes n and the cost degrades to O(n²). A binary search tree that grows long like a list when values are inserted in sorted order is the same phenomenon.

## Requirements hide in the combine step

Merge sort's combine step compares the front elements of two sorted lists and emits the smaller one first. When two values are equal, emitting the element from the left list first keeps elements with the same key in their original order (a stable sort). Whether you write the comparison with `<` or `<=` decides this property.

## Where this concept is used

- Algorithms that split the input to solve it, such as sorting (merge sort) and insertion and lookup in binary search trees.
- Tree data structures in general. The left and right subtrees are the natural split.
- If the subproblems overlap, divide and conquer alone repeats the same work. That's when you move on to dynamic programming.
