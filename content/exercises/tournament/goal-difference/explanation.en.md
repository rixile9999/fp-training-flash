There are more rules than in the base exercise, but the structure is the same: split the lines, parse them, collect the records with a fold, sort, and print the rows. Only the **inside** of each step changed, so the connections between the steps (`standings`) are reused almost unchanged. Splitting functions by step narrows down what you have to fix when the rules change (theory note "Function composition and pipelines").

**Parsing.** Nested `case` expressions check, in order, the split on `;` → the split on `-` → parsing the two integers. If anything is off, the result is `Error(Nil)`, so `3:0` and blank lines are filtered out naturally.

**Updating records.** One match leaves `(home goals, away goals)` for the home team and `(away goals, home goals)` for the away team. If you write `add_game(stats, scored, conceded)` to update one team and call it twice with only the argument order swapped, the switch of point of view is handled in just one place. Win, draw or loss is also decided by the `Gt/Eq/Lt` of `int.compare(scored, conceded)`, so the same function works for both sides.

**Sorting.** With three keys, chain `order.break_tie` twice. Each later key is looked at only when the earlier one is `Eq`, so the priority shows up exactly in the order of the code. If you leave out goal difference, teams with equal points are placed by name alone, which is wrong in cases where goal difference and name order disagree, like `Incheon` (-1) and `Busan` (-3) in the tests.

**Output.** If you split adding the sign into a small function such as `signed(n)`, it is easy to check the case of 0 on its own. Comparing with `n >= 0` produces `+0`, and using only `int.to_string` leaves out the `+` on positive numbers. Decide the boundary value (0) first, then write the condition.

*Original: the `tournament` exercise from Exercism's Gleam track (MIT, Copyright (c) 2021 Exercism). An extended exercise that adds score input and the goal-difference rule.*
