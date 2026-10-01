Players in a role-playing game are represented by the type below. Some players hide their name, and some classes do not use mana, so `name` and `mana` are `Option`s.

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

Implement two functions.

**`introduce(player: Player) -> String`**

- If the name is `Some(name)`, return `name`.
- If the name is `None`, return `"Mighty Magician"`.

**`revive(player: Player) -> Option(Player)`**

- Only revive players whose health (`health`) is 0. If health is 1 or more, return `None`.
- A revived player has 100 health.
- If the level is 10 or above, restore mana to `Some(100)`. Even if the original mana was `None`, it becomes `Some(100)`.
- If the level is below 10, leave mana at its original value.
- The name and level do not change.

```gleam
revive(Player(name: None, level: 3, health: 0, mana: None))
// -> Some(Player(name: None, level: 3, health: 100, mana: None))

revive(Player(name: None, level: 3, health: 42, mana: None))
// -> None
```
