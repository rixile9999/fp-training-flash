If you widen the knapsack table that computes only the maximum value a little, you get the choice along with it. Store `#(total value, list of ids that produced that value)` in each cell, and the last cell holds the whole optimal combination. The structure of the subproblems ("the first k parcels, limit w") is unchanged; only the values stored in the cells got richer (`dynamic-programming-subproblems`).

When taking the parcel is better, the new cell is `[item.id, ..rest_ids]`. Because it is a prepend, the id list of the previous cell is shared, not copied, so carrying a list in every cell does not cost much (`immutability-structural-sharing`, `cost-model-immutable-structures`). Since you fold over the parcels in input order and prepend, the list has the most recently chosen parcel at the front; a single `list.reverse` at the end puts it in input order.

As in the basic knapsack problem, always read from the **previous table** (`previous`). If you read from the table being built, the same parcel gets loaded several times.

Common mistakes:

- Collecting ids by prepending and not reversing them leaves the order backwards.
- Translating load/don't load straight into recursion gives the right answer, but with 40 parcels it follows up to 2^40 cases and never finishes.
- The greedy approach of loading in order of value per weight misses cases like one parcel of weight 10 (value 21) being better than four parcels of weight 2 (value 20).
