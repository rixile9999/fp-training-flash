The skeleton is the same as the basic merge sort. What changes is that the comparison is passed in as a function (so any type can be sorted), and that elements that compare as `Eq` must keep their order.

Stability comes from two choices working together. First, split the list into a **front half and a back half**. Then every element on the left originally came before every element on the right. Second, when merging, if `compare(x, y)` is `Eq`, take **the left element first**. If each half is recursively sorted in a stable way, these two rules make the merged result stable too. Seen as induction, a property that holds for small sizes is preserved by the merge step (`structural-recursion-induction`, `divide-and-conquer`).

Common mistakes:

- Taking the right element first on `Eq` swaps the order of shipments with the same priority.
- Dealing elements alternately into two lists (the 1st, 3rd, 5th and the 2nd, 4th, 6th) saves you from counting the length, but it breaks the assumption that the left side originally came first, so choosing the left on `Eq` no longer guarantees stability.
- Insertion sort is stable if it moves elements back on `Eq`, but it is O(n^2), so it exceeds the time limit with 150,000 elements.

`list.sort` is also a stable sort, so the tests build the expected values for large inputs with `list.sort`.
