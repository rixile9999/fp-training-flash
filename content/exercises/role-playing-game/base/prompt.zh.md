角色扮演游戏中的玩家用下面的类型表示。有的玩家隐藏了名字，有的职业不使用法力值，所以 `name` 和 `mana` 是 `Option`。

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

实现两个函数。

**`introduce(player: Player) -> String`**

- 名字是 `Some(name)` 时返回 `name`。
- 名字是 `None` 时返回 `"Mighty Magician"`。

**`revive(player: Player) -> Option(Player)`**

- 只复活生命值（`health`）为 0 的玩家。生命值为 1 及以上时返回 `None`。
- 复活后的玩家生命值为 100。
- 等级在 10 及以上时，把法力值恢复为 `Some(100)`。原来的法力值即使是 `None`，也会变成 `Some(100)`。
- 等级低于 10 时，法力值保持原值。
- 名字和等级不变。

```gleam
revive(Player(name: None, level: 3, health: 0, mana: None))
// -> Some(Player(name: None, level: 3, health: 100, mana: None))

revive(Player(name: None, level: 3, health: 42, mana: None))
// -> None
```
