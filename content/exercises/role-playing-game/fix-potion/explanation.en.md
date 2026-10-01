The cause of the bug is `option.unwrap(player.mana, 0)` on the first line. After that line, "a class with no mana" (`None`) and "a magician who has run out of mana" (`Some(0)`) both become the same `0`, and the code that follows gives every player `Some(...)` mana. The information "nothing" that the `Option` carried was overwritten with a default value and lost.

The fixed code first splits `player.mana` into `Some` and `None`, and builds a new player only for `Some`.

```gleam
case player.mana {
  Some(mana) -> Some(Player(..player, mana: Some(int.min(mana + amount, max_mana))))
  None -> None
}
```

You can write the same thing as `option.map(player.mana, fn(mana) { Player(..player, mana: Some(...)) })`. `map` lets `None` pass through untouched, so "cannot drink" is kept automatically.

There are two common mistakes while fixing it.

- Changing it to return `None` when the result of `unwrap` is `0`: now a magician with `Some(0)` cannot drink the potion. 0 and "nothing" are still mixed up.
- Returning `Some(player)` for `None`: the caller cannot tell "drank the potion" apart from "could not drink it".

Use `unwrap` only when you are sure that "if there is nothing, substituting this value gives an equally correct result". The theory note "Total and partial functions" (total-vs-partial-functions) says more about why failure should show in the return type.
