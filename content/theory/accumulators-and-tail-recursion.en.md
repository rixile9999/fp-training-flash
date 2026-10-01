---
id: accumulators-and-tail-recursion
title: Accumulators and tail recursion
---
A recursive function can build its result in two ways.

- **Body recursion**: work is still left to do **after** the recursive call returns. `first + sum(rest)` has to wait for the call's result before it can add.
- **Tail recursion**: the recursive call is the **last thing** the function does. Nothing is left to compute, so the call's result is returned as is.

To turn body recursion into tail recursion, you carry "the result so far" along as an argument. That argument is called an accumulator.

```gleam
// Body recursion: the addition waits for the recursive call to finish
pub fn sum(numbers: List(Int)) -> Int {
  case numbers {
    [] -> 0
    [first, ..rest] -> first + sum(rest)
  }
}

// Tail recursion: partial sums pile up in total. The public function picks the initial value
pub fn sum_with_acc(numbers: List(Int)) -> Int {
  sum_loop(numbers, 0)
}

fn sum_loop(numbers: List(Int), total: Int) -> Int {
  case numbers {
    [] -> total
    [first, ..rest] -> sum_loop(rest, total + first)
  }
}
```

The caller shouldn't have to care about the accumulator, so the usual pattern is a public function that supplies the initial value and a private function that does the actual looping.

## The accumulator invariant

You can check that an accumulator function is correct by writing down, in one sentence, "what the accumulator holds". The invariant of `sum_loop(rest, total)` is **total + (sum of rest) = sum of the original list**.

- Start: `total` is 0 and `rest` is the whole list, so it holds.
- One step: `first` is taken off `rest` and added to `total`, so both sides stay the same.
- End: when `rest` is `[]`, `total` is the answer.

Pick the initial value so that the invariant holds from the very start: 0 for a sum, 1 for a product, `[]` for a list. A wrong initial value skews every result. Start a sum at 1 and every result is 1 too large; start a product at 0 and every result becomes 0.

## Building a list reverses its order

When you build a list in an accumulator, you prepend (`[x, ..acc]`, O(1)). The result then comes out in reverse input order, so you call `list.reverse` once at the end (O(n)). You can also carry more than one accumulator. The function below carries a running total and the result list together.

```gleam
import gleam/list

/// [3, 1, 4] -> [3, 4, 8]
pub fn running_totals(numbers: List(Int)) -> List(Int) {
  running_loop(numbers, 0, [])
}

fn running_loop(numbers: List(Int), total: Int, acc: List(Int)) -> List(Int) {
  case numbers {
    [] -> list.reverse(acc)
    [first, ..rest] -> {
      let total = total + first
      running_loop(rest, total, [total, ..acc])
    }
  }
}
```

A common mistake is to keep the order right by appending at every step with `list.append(acc, [x])`. The result is correct, but `append` copies all of `acc` each time, so the total cost becomes O(n²). Forgetting to reverse is also common, and tests that only check one-element lists won't catch it.

## What tail recursion does and doesn't buy you on the BEAM

The BEAM runs a tail call without a new stack frame (last call optimization), so a tail-recursive function never grows the stack, however many times it loops. Body recursion uses stack in proportion to the call depth. But a BEAM process's stack grows as needed, so unlike environments with a fixed stack size, it doesn't overflow at a depth of a few tens of thousands. It just uses memory proportional to the depth.

So "tail recursion is always faster" isn't true on the BEAM. For a function that builds a list, body recursion produces the result in the right order directly, while tail recursion has to accumulate and then reverse once more. The two are usually about the same in speed and memory, and the Erlang Efficiency Guide addresses this myth specifically.

Tail recursion is clearly needed when:

- A loop never ends or runs for a very long time (a server loop, a state machine). With body recursion, memory piles up with every iteration.
- You process very long input in an environment with a fixed memory limit.
- The result is a single value such as a sum, a count or a maximum. The accumulator version finishes in constant memory and needs no reversal.

`list.fold(numbers, 0, fn(total, x) { total + x })` is this accumulator loop turned into a named function. You only supply the initial value and the update for one step.

## Where this concept is used

- Reducing a list to a single value. A hand-written accumulator loop and `list.fold` have the same shape.
- Building a result list by prepending and reversing once at the end.
- Tracking several pieces of state at once, such as the previous and current value or a total and a count, with several accumulators.
- Turning O(n²) recursion, such as reversing with `append`, into linear time.
