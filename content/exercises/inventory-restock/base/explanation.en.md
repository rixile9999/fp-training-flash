Every item has to stay in the result, so we use `list.map`, which preserves the shape of the list. The only thing to decide for each item is "do we increase the stock?", and we split on that with `case`.

The value to change, `on_hand`, lives in the `Stock` inside the `Item`. Gleam values never change, so "fixing only the inner field" is really two steps:

1. Build a new `Stock` with `Stock(..stock, on_hand: stock.on_hand + stock.reorder_qty)`.
2. Build a new `Item` that holds it with `Item(..item, stock: new_stock)`.

`..stock` and `..item` carry over the remaining fields with their original values, so you do not have to write out fields like the name or `reorder_point` again, and you cannot change them by accident. The parts that did not change are shared by the new and the old record (theory note "Immutable values and structural sharing").

There are three common mistakes: writing the condition with `<` and missing items whose stock is exactly at the reorder point; using `list.filter` to keep only the items to restock and losing the rest; and overwriting instead of adding, as in `on_hand: stock.reorder_qty`.

If you extract the update of a single item into `restock_item`, the code that handles the list only says "apply the same rule to every item" (theory note "Structure-preserving transformations: functors").
