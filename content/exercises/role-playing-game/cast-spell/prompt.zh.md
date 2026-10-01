实现玩家施法的函数 `cast_spell(player: Player, cost: Int) -> #(Player, Int)`。返回值是施法后的玩家和法术造成的伤害。`cost` 大于等于 0。

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

规则按法力值的状态分为三种。

- **法力值是 `Some(mana)` 且 `mana >= cost`**：法力值减少 `cost`，伤害为 `cost * 2`。
- **法力值是 `Some(mana)` 且 `mana < cost`**：什么也不发生。玩家保持不变，伤害为 0。
- **法力值是 `None`**（不使用法力值的职业）：生命值减少 `cost`，伤害为 0。生命值不会小于 0。

`Some(0)` 表示“法力值耗尽”，`None` 表示“根本没有法力值”。两者遵循不同的规则。

```gleam
cast_spell(Player(name: None, level: 18, health: 123, mana: Some(30)), 14)
// -> #(Player(name: None, level: 18, health: 123, mana: Some(16)), 28)
```
