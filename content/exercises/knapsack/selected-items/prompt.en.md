The dispatcher for a delivery truck needs to know not just the total value but also **which parcels to load**. Given a list of parcels and a weight limit, find the total value of the combination with the largest total value, and the list of its parcel ids.

```gleam
pub type Cargo {
  Cargo(id: String, value: Int, weight: Int)
}

pub type Selection {
  Selection(total_value: Int, ids: List(String))
}

pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection
```

- The total weight of the chosen parcels is at most `max_weight`. Each parcel is loaded at most once. Values and weights are positive integers.
- `ids` holds the ids of the chosen parcels **in the order of the input list**. If nothing can be loaded, the result is `Selection(0, [])`.
- In the test inputs there is exactly one combination with the largest total value.
- It must finish within the time limit even with 40 parcels.

```gleam
best_selection(
  [Cargo("a", 60, 5), Cargo("b", 50, 4), Cargo("c", 70, 6), Cargo("d", 30, 3)],
  10,
)
// -> Selection(total_value: 120, ids: ["b", "c"])
```
