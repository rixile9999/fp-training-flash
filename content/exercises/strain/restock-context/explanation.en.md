`both` and `negate` are functions that take condition functions and return a **new condition function**. The anonymous function they return remembers the outer arguments `p` and `q`, so it can compute both conditions later when it receives an element.

```gleam
pub fn both(p, q) { fn(item) { p(item) && q(item) } }
pub fn negate(p) { fn(item) { !p(item) } }
```

Once you can assemble conditions like this, you write the filtering logic (`keep`) only once and express business rules as combinations of conditions.

```gleam
keep(products, both(is_active, fn(product) { product.stock < threshold }))
keep(products, negate(is_active))
```

"How to filter" and "what to filter" are separated, so `keep` stays the same even when the rules change. This style of building programs by passing small functions as values and combining them is covered in the theory note higher-order-modularity (Higher-order functions and modularity).

There are two common mistakes:

- Using `||` inside `both`, which puts even discontinued products on the restock list.
- Writing the threshold comparison as `<=`, which includes products whose stock equals the threshold. "Less than" in the problem means strictly below.
