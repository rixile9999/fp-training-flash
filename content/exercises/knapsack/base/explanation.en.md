Each item has only two branches, "pack it" or "don't", so if you translate the definition straight into recursion, the answer is correct. Exercism's example solution has this shape too. But with n items it follows up to 2^n cases, so with 50 items it never finishes.

Yet the only question this recursion actually asks is "what is the maximum value from the first k items within weight limit w?", and there are only (number of items) x (limit + 1) distinct questions. The same question comes up again and again along different paths, so if you store the answers in a table, each question is solved only once (`dynamic-programming-subproblems`). With 50 items x 401 cells, that is about 20,000 steps.

The solution folds over the items one at a time, building a new `Dict(weight limit, maximum value)` each time. Cell w of the new table is max(skip = cell w of the previous table, take = cell (w - weight) of the previous table + value). A missing cell means "nothing packed", so reading it as 0 is also correct.

The key is **reading from the previous table**. If you read from the new table you are building, then as you go up through the limits you read back cells where this item was just packed, and you end up packing the same item many times (it becomes the unbounded knapsack). With an immutable `Dict`, the previous table stays as it is even after you build a new one, so you can keep reading it under the name `previous`. This is exactly why imperative languages, which overwrite a single array, need the trick of going through the limits backwards (`immutability-structural-sharing`).

The greedy approach of packing in order of value per weight is fast, but it is wrong in cases like one item of weight 10 (value 21) being better than four items of weight 2 (value 20).
