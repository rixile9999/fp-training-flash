`int.random` returns a different value every time you call it. `pick_daily_deal`, which calls such a function inside, also gives different results for the same input, so you can't pin down "which product ends up at what price" in a test. Randomness, like printing, is an **effect**.

The solution is to **take the result of the effect (the chosen position) as an argument**. `apply_deal(products, index)` is a pure function that always returns the same result for the same list and position, so you can test position 0, the last position and out-of-range positions. The random value is created just once, in the outer shell `pick_daily_deal`, and passed in.

```gleam
apply_deal(products, int.random(list.length(products)))
```

Going through every product with `list.index_map` and changing only the one at the matching position preserves the list's length and order. An out-of-range position never equals any `i`, so the list comes out unchanged without a separate branch. Avoid fetching and fixing the element with `list.drop` and `let assert`, because that crashes when the position is out of range.

There are two common mistakes:

- Counting positions from 1 (`i + 1 == index`) discounts the product one slot off.
- Forgetting the "round down to the nearest 100 won" part of the discount rule. Keeping `deal_price` separate lets you check this rule on its own. In `price * 70 / 100 / 100 * 100`, the integer division `/ 100 * 100` drops anything below 100 won.

Splitting a deterministic core calculation from a non-deterministic outer shell is discussed further in the theory notes "Separating computation from effects" and "Referential transparency".
