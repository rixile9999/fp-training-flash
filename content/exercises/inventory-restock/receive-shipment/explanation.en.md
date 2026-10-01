This problem combines two lists, but the result has the same shape as the **item list**. So the last step is a `list.map` over the items, and before that the deliveries are turned into a lookup value that answers "how much arrived for each sku".

1. Fold the deliveries into a `Dict(sku, total quantity)` with `list.fold` and `dict.upsert`. If the key is new, store the quantity as is; if it already exists, add to it.
2. For each item, look up the total with `dict.get`. If there is one, build a new item with `Stock(..stock, on_hand: ...)` and `Item(..item, stock: ...)`; otherwise leave the item as it is.

Because the iteration is driven by the item list, deliveries for skus that are not in the list are ignored naturally, and the order is kept. Scanning the whole delivery list again for every item also gives the right answer, but as the numbers of items and deliveries grow, it does work proportional to the product of the two list lengths.

A common mistake is to build the lookup dictionary with `dict.from_list`. When a key appears several times, `dict.from_list` keeps only the last value, so deliveries of the same item are not summed. Also, if you keep only the delivered items with `list.filter_map`, the other items disappear.

Reducing the deliveries to totals is a fold (theory note "The universality of fold: the common skeleton of list recursion"), and replacing only some values while keeping the shape of the item list is an immutable record update (theory note "Immutable values and structural sharing"). Together they form a typical combination.
