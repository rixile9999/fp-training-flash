Merge sort is the textbook example of divide and conquer (`divide-and-conquer`). You split the list in half (`split`), sort each half the same way, and combine the two sorted halves (`merge`). Splitting is O(n) and merging is O(n) too, and since the list halves each time, the recursion is log n deep. So the whole thing is O(n log n).

For the recursion to end, you must handle the sizes that "can't be split any further" as base cases. A list with 0 or 1 elements is already sorted, so it is `[] | [_] -> items`. A common mistake is making only `[]` a base case. Then `[x]` is split into `#([], [x])`, and sorting `[x]` again repeats the same call forever. Checking that the input to every recursive call **always gets smaller** is what guarantees termination (`structural-recursion-induction`).

Another common approach is insertion sort. Inserting elements one at a time into a sorted list gives the right result, but each insertion walks half of the list on average, so it is O(n^2). With 150,000 elements that is about 5.6 billion comparisons, which exceeds the time limit, while merge sort needs only about 2.6 million.

Keeping `split`, `merge` and `sort` separate lets you test each piece independently, and `sort` reads exactly like the description of the algorithm: "split, sort each half, merge".
