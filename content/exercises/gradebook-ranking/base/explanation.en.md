A ranking takes two steps: "sort, then attach positions".

The sort order goes into a single comparison function. `int.compare(b.score, a.score)` swaps the arguments to get score-descending order, and `order.break_tie(..., string.compare(a.name, b.name))` uses the name comparison only when the score comparison is `Eq`. Keeping the order in a named function, `by_rank_order`, makes "what are we sorting by" visible at a glance, and `list.sort` only has to take that order as an argument. Separating the sorting algorithm from the sort order is the modularity that higher-order functions give you (theory note "Higher-order functions and modularity").

Then `list.index_map` turns each student into `#(rank, name)` while keeping the shape of the sorted list. Positions start at 0, so add 1.

There are three common mistakes. Using `int.compare(a.score, b.score)` as is gives ascending order, so the lowest score ends up 1st. Forgetting to add 1 to the position makes ranks start at 0. Leaving out the tie-break means tied students stay **in input order**, because `list.sort` is a stable sort, so the same students can produce different rankings depending on input order. For the result not to depend on input order, the comparison has to decide the order of every pair of students.
