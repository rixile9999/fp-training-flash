Implement `cast_spell(player: Player, cost: Int) -> #(Player, Int)`, the function a player uses to cast a spell. It returns the player after casting and the damage the spell dealt. `cost` is 0 or more.

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

The rules split three ways depending on the mana state.

- **Mana is `Some(mana)` and `mana >= cost`**: mana drops by `cost`, and the damage is `cost * 2`.
- **Mana is `Some(mana)` and `mana < cost`**: nothing happens. The player is unchanged and the damage is 0.
- **Mana is `None`** (a class that does not use mana): health drops by `cost` and the damage is 0. Health never goes below 0.

`Some(0)` means "out of mana", while `None` means "has no mana at all". The two follow different rules.

```gleam
cast_spell(Player(name: None, level: 18, health: 123, mana: Some(30)), 14)
// -> #(Player(name: None, level: 18, health: 123, mana: Some(16)), 28)
```
