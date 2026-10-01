---
id: dynamic-programming-subproblems
title: 'Dynamic programming: solve each subproblem once'
---
If you split a problem recursively and the same subproblem comes up again and again along different paths, store each answer the first time you solve it and reuse it. That is dynamic programming. Use it when two conditions hold.

- **Optimal substructure**: the answer to a large problem can be built from answers to smaller problems.
- **Overlapping subproblems**: the same smaller problem is needed many times.

## Overlap makes the cost explode

Translate the Fibonacci numbers `fib(n) = fib(n - 1) + fib(n - 2)` directly into recursion, and `fib(n - 2)` is computed in both branches, and so on all the way down. The number of calls grows exponentially in n (roughly 1.6ⁿ). Yet there are only n + 1 distinct subproblems, `fib(0)` through `fib(n)`. Solve each one once and it's O(n).

## Design steps

1. **State**: what distinguishes one subproblem from another? A position in a list, an amount left, a pair of prefix lengths of two strings, and so on. If information that affects the answer is missing from the state, different problems get stored in the same cell and the answers come out wrong.
2. **Recurrence**: write the answer for a state in terms of answers for smaller states.
3. **Base cases**: answers for states that can't be reduced further, usually the size-0 cases such as "ways to make 0" or "distance to the empty string".
4. **Order of computation**: when you compute a state, the smaller states it needs must already be ready.
5. **Location of the answer**: which state is the original problem?

The total cost is roughly (number of states) × (cost of computing one state). If the table is a `Dict`, add about O(log n) per lookup.

## Top down: pass the memo along

An immutable language has no global cache, so you take the memo table as an argument and return the updated table along with the result.

```gleam
import gleam/dict.{type Dict}

pub fn fib_memo(n: Int, memo: Dict(Int, Int)) -> #(Int, Dict(Int, Int)) {
  case n <= 1 {
    True -> #(n, memo)
    False ->
      case dict.get(memo, n) {
        Ok(value) -> #(value, memo)
        Error(Nil) -> {
          let #(a, memo) = fib_memo(n - 1, memo)
          let #(b, memo) = fib_memo(n - 2, memo)
          let value = a + b
          #(value, dict.insert(memo, n, value))
        }
      }
  }
}
```

The key is to pass the second call the table **returned** by the first call. If you pass the same original table to both calls, the cells the first call filled are thrown away, and even though the code has a memo, it still takes exponential time. Rebinding the same name `memo` as above makes it impossible to use the old table by accident.

## Bottom up: carry only what you need

If you fill states starting from the smallest, the order of computation takes care of itself. Fibonacci only needs the two previous values, so two accumulators replace the whole table.

```gleam
pub fn fib(n: Int) -> Int {
  case n <= 0 {
    True -> 0
    False -> fib_loop(1, n, 0, 1)
  }
}

// previous = fib(i - 1), current = fib(i)
fn fib_loop(i: Int, n: Int, previous: Int, current: Int) -> Int {
  case i == n {
    True -> current
    False -> fib_loop(i + 1, n, current, previous + current)
  }
}
```

The same idea works when the state is two-dimensional. If each row depends only on the row right above it, carry just the previous row as a list instead of the whole table, and build the next row from it. Accessing the i-th element of a list is O(i), so when you build a row, don't look up by index; walk the previous row alongside.

## When greedy doesn't work

You need dynamic programming when "always take the choice that looks best right now" doesn't guarantee the overall optimum. To make 6 from coins of 1, 3 and 4, picking the largest coin first gives 4 + 1 + 1, three coins, but the optimum is 3 + 3, two coins. You have to compare every choice using the answers to subproblems.

## Where this concept is used

- Problems that ask for a minimum count, a maximum value, a number of ways, or the distance between two strings.
- When the same state shows up repeatedly in a backtracking search. Add a memo keyed by the state and it becomes dynamic programming.
