There is a bug in `checkout`, the checkout function of an online store: even items that are out of stock get paid for. Fix the code.

```gleam
pub type Status {
  Draft
  Paid
}

pub type Order {
  Order(id: Int, amount: Int, status: Status)
}

pub fn checkout(
  order: Order,
  check_stock: fn(Order) -> Result(Order, String),
  apply_points: fn(Order) -> Order,
  charge: fn(Order) -> Result(Order, String),
) -> Result(Order, String)
```

The correct behavior is as follows.

1. Check the stock with `check_stock`. If it fails, return that error unchanged and do not run the later steps.
2. Apply points with `apply_points` to the order returned by the stock check. This step never fails.
3. Pay for the order with points applied using `charge`. If it fails, return that error unchanged.
4. If everything succeeds, set the `status` of the order returned by the payment to `Paid` and return it as `Ok`.

```gleam
checkout(Order(1, 10_000, Draft), fn(_) { Error("Out of stock") }, apply_points, charge)
// -> Error("Out of stock")
```
