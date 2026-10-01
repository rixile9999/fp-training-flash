`pop` removes the first item of `front`; if `front` is empty, it reverses `back` once, moves it into `front` and tries again. Each item is moved only once by a reversal, so `pop` is amortized O(1) (`amortized-analysis`).

`take` can be defined as "take one, then take n - 1 from the rest". There are two stopping conditions: when there is nothing left to take (when `n > 0` does not hold) and when the queue is empty. Collecting by prepending to the accumulator `taken` gives the reverse of the order taken, so when you stop, reverse once with `list.reverse` to restore arrival order. An accumulator plus a final reversal is the textbook shape of tail recursion (`accumulators-and-tail-recursion`).

There are three common mistakes. If you do not reverse the accumulator, the batch comes out in reverse. If you write the stopping condition as `n >= 0`, you take one too many. If you stop only at 0, as in `case n { 0 -> ... }`, a negative n drains the whole queue. Checking `n > 0` handles 0 and negative numbers in one go.

`take` also returns the remaining queue because the queue is immutable. The original queue stays as it was, so the state after taking can only be passed on through the return value.
