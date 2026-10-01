The function `drink_potion(player: Player, amount: Int) -> Option(Player)`, for drinking a mana potion sold in the game shop, has already been written. But a bug has been reported: when a class that does not use mana, such as a warrior, drinks a potion, it suddenly gains mana. Fix the code.

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

The correct rules are as follows. `amount` is 0 or more.

- If mana is `Some(mana)`, return the player with mana increased by `amount`, wrapped in `Some`. Mana does not go over 100.
- Even if mana is `Some(0)`, the class has mana, so the player can drink the potion.
- If mana is `None`, the player cannot drink the potion, so return `None`.
- The name, level and health do not change.

```gleam
drink_potion(Player(name: None, level: 3, health: 50, mana: Some(90)), 30)
// -> Some(Player(name: None, level: 3, health: 50, mana: Some(100)))

drink_potion(Player(name: None, level: 3, health: 50, mana: None), 30)
// -> None
```
