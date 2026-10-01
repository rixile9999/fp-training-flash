Here is `maximum_value`, which chooses the parcels to load onto a delivery truck. Each parcel has a value and a weight, and the truck can carry only up to `maximum_weight`. But with a single parcel `Item(value: 10, weight: 3)` and a limit of 9, it returns 30. That means the same parcel was loaded three times. Fix it so that each parcel is loaded at most once.

- The total weight of the chosen parcels must be at most `maximum_weight`, and the total value must be as large as possible.
- Each parcel is either loaded or not. Values and weights are positive integers.

```gleam
maximum_value([Item(value: 10, weight: 3)], 9)
// now:      30
// expected: 10
```
