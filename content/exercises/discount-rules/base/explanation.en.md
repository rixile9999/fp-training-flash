`percent_off` and `amount_off` return a **function**, not a price. The inner anonymous function `fn(price) { ... }` remembers the outer argument `percent` or `amount`, so `percent_off(10)` becomes a value meaning "a rule that takes 10% off". Once rules are values, you can put them in a list, reorder them and pass them to other functions. When a new kind of discount appears, `apply_rules` does not need to change (theory topic "Higher-order functions and modularity").

`apply_rules` uses `list.fold` to carry "the price discounted so far" as the accumulator and applies the rules one at a time. The initial value is the original price, so with no rules the price comes out unchanged. Folding over a list of rules is the same as composing the rules into a single function (theory topic "Function composition and pipelines").

Common mistakes:

- With `list.fold_right`, the rules are applied from the back. A percentage discount and a fixed-amount discount give different results depending on their order (8000 vs 8100), so the order is part of the requirements.
- Without a lower bound on the fixed-amount discount, you get negative prices. If each rule keeps the invariant itself, as in `int.max(price - amount, 0)`, the price never becomes negative no matter how the rules are combined.
