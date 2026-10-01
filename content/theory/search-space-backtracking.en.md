---
id: search-space-backtracking
title: Search spaces and backtracking
---
A problem that asks for a combination of choices satisfying some conditions can be viewed as a tree called the **search space**. The root is the state where nothing has been chosen, each edge is one choice, and each leaf is a candidate where every choice has been made. This tree grows fast. Deciding for each of n products whether to include it gives 2ⁿ leaves; arranging n items in a row gives n!.

**Backtracking** is a search that walks down this tree depth-first and, as soon as a partial choice already violates the conditions, discards the whole branch below it (pruning).

## With immutable state, undoing is free

Imperative code changes the board, recurses, then comes back and undoes the change. Forget to undo, and the next branch is contaminated. With immutable values, you just build a new state and pass it to the recursive call. The caller's state is untouched, so when the call returns you try the next choice from the original state. No undo code means no undo bugs.

## What should the result be?

For the same search, the way branch results are combined depends on the question.

- **Number of solutions**: return an `Int` and add up the counts from each branch.
- **All solutions**: return a `List` and concatenate the branch results. Failure is the empty list.
- **One solution**: return a `Result`; stop if the first branch is `Ok`, and try the next branch if it is `Error`.

The two functions below look for combinations from a list of product prices that add up to exactly `budget`. Assume all prices are positive. For each product, the search goes down two branches: "include it" and "don't include it".

```gleam
pub fn count_combinations(prices: List(Int), budget: Int) -> Int {
  case budget, prices {
    0, _ -> 1
    _, _ if budget < 0 -> 0
    _, [] -> 0
    _, [price, ..rest] ->
      count_combinations(rest, budget - price)
      + count_combinations(rest, budget)
  }
}

pub fn find_combination(
  prices: List(Int),
  budget: Int,
) -> Result(List(Int), Nil) {
  case budget, prices {
    0, _ -> Ok([])
    _, _ if budget < 0 -> Error(Nil)
    _, [] -> Error(Nil)
    _, [price, ..rest] ->
      case find_combination(rest, budget - price) {
        Ok(chosen) -> Ok([price, ..chosen])
        Error(Nil) -> find_combination(rest, budget)
      }
  }
}
```

For example, `count_combinations([2, 3, 5], 5)` is 2, because there are two combinations: `[2, 3]` and `[5]`. The order of the base cases matters. If the remaining budget is 0, a combination is complete regardless of the remaining products, and if the budget goes negative, there's no need to look further down that branch.

## Prune as early as possible

If you check the conditions all at once at the leaves, you build even the candidates you'll throw away all the way to the end. If you check each time you add a choice, you skip the whole branch under a bad partial choice. The worst-case complexity stays the same, but the number of nodes actually visited drops sharply. In the example above, the search stops looking below the moment the budget goes negative.

If the same state (here, "the position of the remaining products and the remaining budget") repeats across many branches, you can add a memo and turn it into dynamic programming.

## Shortest paths need breadth-first search

Depth-first search finds some path, but there's no guarantee it's the shortest. To find the shortest distance in a graph or grid where every edge costs the same, use **breadth-first search**. It spreads out by visiting every cell at distance 1 from the start before any cell at distance 2, so the distance at the moment you first reach the destination is the shortest distance.

- You need a **queue**. Appending to the back of a single list costs O(n) per push, so use a queue made of two lists, or build "the list of cells at the next distance" from "the list of cells at the current distance" all at once.
- You need a **visited set**. Without it, you add the same cell many times, and in a graph with cycles the search never ends. Mark a cell as visited **when you add it** to the queue, so the same cell isn't queued more than once.

## Where this concept is used

- Combinatorial searches that build up choices one at a time, such as joining fragments together or placing pieces on a board.
- Shortest distances in mazes and grids (breadth-first search).
- A starting point for turning a search with repeated states into dynamic programming with a memo.
