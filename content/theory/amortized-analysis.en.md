---
id: amortized-analysis
title: 'Amortized analysis: the real cost of occasionally expensive operations'
---
Looking only at the worst-case cost of a single operation is sometimes far too pessimistic. If an operation is cheap most of the time and only occasionally expensive, the total cost of doing it **many times in a row** is a more accurate measure. If, for any sequence of operations, the total cost of m operations is at most m × c, the **amortized cost** of the operation is c.

Amortized cost is not average-case analysis. It assumes no input distribution or probabilities; it is a guarantee that holds for **every** possible sequence of operations.

## Example: a binary counter

Add 1 to a binary number stored lowest digit first. Starting from the lowest digit, turn each 1 in the run into 0, then turn the first 0 you meet into 1.

```gleam
/// [1, 1, 0, 1] is 1 + 2 + 8 = 11, and the result [0, 0, 1, 1] is 12.
pub fn increment(bits: List(Int)) -> List(Int) {
  case bits {
    [] -> [1]
    [0, ..rest] -> [1, ..rest]
    [_, ..rest] -> [0, ..increment(rest)]
  }
}
```

One call costs the number of consecutive 1s starting at the lowest digit, plus 1. If every digit is 1, it costs as many steps as there are digits, that is O(log n). But while you add 1 n times starting from 0, the last digit changes every time, the next one every second time, the one after that every fourth time, and so on. The total number of changes is n + n/2 + n/4 + ... < 2n, so the amortized cost is O(1).

## The banker's method: cheap operations save up

Charge each operation an **amortized cost** a bit larger than its actual cost, and save the surplus inside the data structure as **credit**. Expensive operations pay with the saved credit. As long as the credit never goes negative, the actual total cost never exceeds the sum of the amortized costs.

In the binary counter, turning a 0 into a 1 costs 1, and you also leave 1 credit on that digit. Later, the cost of turning that 1 back into 0 is paid by the credit left there. Each increment turns at most one 0 into a 1, so the amortized cost is 2.

## Example: a queue made of two lists

A queue removes from the front and adds at the back. With a single list, adding at the back costs O(n). So you keep two lists: `front` for removing and `back` for adding. New elements are prepended to `back` (O(1)), so `back` holds them in reverse order of insertion. When you remove and `front` is empty, you reverse `back` and move it to `front`.

| Operation | `front` | `back` | Actual cost |
|---|---|---|---|
| push 1 | `[]` | `[1]` | 1 |
| push 2 | `[]` | `[2, 1]` | 1 |
| push 3 | `[]` | `[3, 2, 1]` | 1 |
| pop → 1 | `[2, 3]` | `[]` | 3 (reverse) + 1 |
| push 4 | `[2, 3]` | `[4]` | 1 |
| pop → 2 | `[3]` | `[4]` | 1 |

Reversing occasionally costs O(k), but each element moves from `back` to `front` **exactly once**. If you attach 1 credit to an element when you push it, that element's share of the reversal is already paid for. So any sequence of m pushes and pops costs O(m) in total, and both operations are amortized O(1).

## Persistent use breaks the guarantee

The banker's method assumes saved credit is spent **only once**. With immutable data structures, old versions stay around, so that assumption can break. Take a queue `q` whose `front` is empty and whose `back` holds 1000 elements. Call pop on that same `q` 100 times, and every call reverses all 1000 elements again. You saved once but withdrew 100 times. The binary counter is the same: call `increment` repeatedly on the same all-ones value, and each call costs as many steps as there are digits.

If a loop always continues from the most recent version (most queue usage does), the amortized guarantee still holds. If you need the guarantee even when old versions are reused, there are techniques based on lazy evaluation and memoization, which Okasaki covers in detail.

## Where this concept is used

- Places where pushes and pops keep interleaving, such as the queue in a breadth-first search.
- Explaining the cost of data structures that occasionally reverse or rebuild themselves.
- Conversely, appending one element at a time to the end of a list with `list.append` is O(n) even when amortized, because the expensive work happens every time, not occasionally.
