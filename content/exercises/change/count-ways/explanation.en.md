The most common trap when counting combinations is counting arrangements that differ only in order as separate ways. If you count "ways to make amount a = the sum over each coin c of (ways to make a - c)", you are splitting by which coin was handed over last, so 1 + 2 and 2 + 1 become different ways. Making 5 from `[1, 2, 5]` is then counted as 9 instead of 4.

To count without duplicates, set up the subproblem so that coins are used **in order of type**. "The number of ways to make a using only the first k types" is the sum of the case where the k-th coin is not used at all (the first k-1 types make a) and the case where it is used at least once (the first k types make a - c). The two cases never overlap, and together they cover every combination (`dynamic-programming-subproblems`).

In the solution, `list.fold(coins, ...)` is the outer part that adds coin types one by one, and the inner `int.range` walks up through the amounts applying `ways[a] = ways[a] + ways[a - coin]`. Because it reads `ways[a - coin]` after that entry has already been updated, cases that use the same coin several times are included. The table is only as large as the number of amounts and is swept once per coin type, so the cost is O(amount x number of coin types).

If you write the same formula as plain recursion without a table, it follows every single combination to the end to count it, so the number of calls is at least as large as the answer. The answer for 2000 is about 23.8 billion, so it never finishes. With a table, about 16,000 updates are enough.

0 is "the one way that uses nothing", so its value is 1. You need this base value so that a case that is made exactly by one coin is counted as 1.
