The rules split by the three states of mana, so if you make a `case` on `player.mana` alone and give it three branches, the rules and the code line up one to one.

```gleam
case player.mana {
  Some(mana) if mana >= cost -> ...  // Cast succeeds
  Some(_) -> #(player, 0)             // Not enough mana
  None -> ...                         // No mana: pay the price in health
}
```

The most common mistake is to take the value out first with `option.unwrap(player.mana, 0)`. Then `None` (no mana at all) and `Some(0)` (out of mana) both become the same 0, and there is no way to tell them apart again. In this exercise the two have different results: `Some(0)` does nothing, while `None` reduces health. Keeping "nothing" from getting mixed up with other values is exactly why you use `Option`, so if the rules differ, you have to handle `None` separately with `case`.

Watch the two boundaries as well.

- The casting condition is `mana >= cost`. If you write `>`, casting fails when the player has exactly enough mana.
- Use `int.max(0, player.health - cost)` so health does not go below 0.

Returning `player` as is in the not-enough-mana branch is also deliberate. It is an immutable value, so "no change" is expressed by returning the original value instead of building a new one.

The idea of showing "nothing" in the type so that every case gets handled is covered further in the theory note "Sum types and exhaustive matching" (algebraic-data-types).
