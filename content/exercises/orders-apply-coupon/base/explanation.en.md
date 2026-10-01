Every order has to stay in the result, so `list.map`, which preserves the shape of the list, is the right fit. The only decision for each order is "do I change this order's amount?": split on the status with `case`, and only when it is `Pending`, build a new value with the record update syntax `Order(..order, amount: ...)`.

If you use `list.filter` first, orders that are not `Pending` disappear from the result. This exercise asks you to "change only some", not to "keep only some".

If you pull the discount calculation out into a `discount` function, you can check the formula on its own, and the transformation function shows only "what changes".
