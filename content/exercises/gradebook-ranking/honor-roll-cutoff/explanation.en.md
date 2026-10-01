Cutting "the top n" with `list.take(n)` is simple, but when the n-th and the next student are tied, who gets in is decided by the accident of their names. The rule in this exercise is "everyone at or above the cutoff score", so first find the **cutoff score**, then cut by that score.

1. From the sorted list, take the first n students with `list.take(sorted, n)` and use the last of them, found with `list.last`, as the cutoff.
2. From the whole sorted list, take students with `list.take_while` as long as their score is at or above the cutoff. Because the list is sorted, you can stop at the first student below the cutoff.

The key point is that the edge cases are handled automatically by the properties of `list.take` and `list.last`. If `n` is 0 or less, `take` gives an empty list and `last` returns `Error(Nil)`, so the honor roll is empty. If `n` is larger than the number of students, `take` gives everyone, so the cutoff is the last-place student and everyone makes the honor roll. Because the lookup that can fail comes back as a `Result`, you cannot forget the empty case.

A common mistake is to use the first element of `list.drop(sorted, n - 1)` as the cutoff. If `n` is 0, `drop` gets -1 and drops nothing, so the top student becomes the cutoff; if `n` is larger than the number of students, no cutoff is found and the honor roll comes out empty. If you keep the sort order separate as `by_rank_order`, you can reuse exactly the same order as in the ranking exercise (theory note "Higher-order functions and modularity").
