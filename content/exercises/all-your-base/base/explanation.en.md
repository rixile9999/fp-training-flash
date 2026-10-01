Base conversion becomes simple once you split it into two steps: "digit list → integer → digit list". In the first step, accumulating `total * base + digit` from the left gives you the value. In the second step, collecting the remainders of dividing the value by the output base gives you the new digits.

Only the first step can fail, so that is the only place that creates errors. `list.try_fold` stops as soon as an `Error` appears during accumulation, so it naturally reports "the first invalid digit". The return type `Result(List(Int), RebaseError)` makes the possibility of failure visible, so the caller cannot ignore invalid input. This is the core of the theory note "Errors are values too" (errors-as-values). And because it never crashes and returns `Ok` or `Error` for every input, it is a total function (theory note "Total and partial functions", total-vs-partial-functions).

It also matters that the base check, `case input_base < 2, output_base < 2`, is finished first. If the output base is 1, `value / 1` never gets smaller, so the second step never ends; if it is 0, Gleam's integer division returns 0 and you get nonsense digits. Fixing the order of the checks is for a different reason: even when several errors overlap, there must be exactly one rule for which one to report, so that the same input always gives the same result.

There are two common mistakes.

- When the value is 0, a "divide until it reaches 0" loop never runs even once and returns `[]`. The solution adds the remainder first and only then stops with `value < base`, so 0 also becomes `[0]`.
- Leaving out the digit check and only computing with `fold`. `[1, 2]` (in binary) silently becomes 4, and a wrong answer looks like a correct one.
