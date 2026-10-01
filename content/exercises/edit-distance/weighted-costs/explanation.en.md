In the recurrence for edit distance with every cost equal to 1, the three places where `+ 1` appears are three different edits. If d(i, j) is "the minimum cost to turn the first i characters of `from` into the first j characters of `to`", then

- the path coming from d(i-1, j) **deletes** the i-th character of `from`,
- the path coming from d(i, j-1) **inserts** the j-th character of `to`, and
- the path coming from d(i-1, j-1) is a **substitution** (0 if the characters are equal).

So all you have to do is add the matching cost in each place. The shape of the subproblems is unchanged and only the costs differ, so you reuse the base exercise's "build the next row from the row above" structure as is (`dynamic-programming-subproblems`).

The base cases have to follow the costs too. The first row d(0, j) is the cost of inserting j characters into an empty string, `j * insert`, and the first cell of each row d(i, 0) is the cost of deleting all i characters, `i * delete`. When every cost is 1, "number of characters" and "cost" are the same, which is the only reason this difference never showed up.

Even when substitution costs more than deletion + insertion, you do not need to handle it separately. Because you pick the minimum of the three candidates, if the "one step up + one step left" path is cheaper than the diagonal, that path is chosen.

A common mistake is to swap the directions of insertion and deletion. In this exercise, insertion means "adding to `from`", and the path coming down from above consumes one character of `from`, so it is a deletion. With symmetric costs the tests pass, but the answer goes wrong once insertion and deletion costs differ.
