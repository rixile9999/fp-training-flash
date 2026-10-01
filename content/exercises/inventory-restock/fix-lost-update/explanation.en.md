The original code was written out of an imperative habit: "go through each shelf and fix it". But in Gleam, `Shelf(..shelf, ...)` does not modify the existing shelf; it only builds a **new value**. `list.each` throws away the values returned by the function and returns `Nil`, so the newly built shelves are not stored anywhere and simply disappear. The `shelves` returned afterwards is exactly the list that came in.

The fix is to switch the iteration to `list.map`, so that the value built for each shelf becomes an element of the result list. The condition check and the record update are correct as they were. If you extract the handling of one shelf into `refill_one`, `refill` only says "apply the same rule to every shelf".

There are two common half-fixes. If you pick only the shelves to fill with `list.filter` and then `map` them, the other shelves disappear from the result. If you collect with `list.fold` by prepending, as in `[updated, ..acc]`, the result comes out reversed and needs a `list.reverse` at the end; at that point `list.map` is more direct.

Because values never change (theory note "Immutable values and structural sharing"), a function's result lives only in its return value, so the return value alone tells you everything the function did.
