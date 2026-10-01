喝游戏商店出售的法力药水的函数 `drink_potion(player: Player, amount: Int) -> Option(Player)` 已经写好了。但有人报告了一个 bug：像战士这样不使用法力值的职业喝了药水后，会突然拥有法力值。请修复代码。

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

正确的规则如下。`amount` 大于等于 0。

- 法力值是 `Some(mana)` 时，把法力值增加 `amount` 后的玩家用 `Some` 返回。法力值不超过 100。
- 法力值是 `Some(0)` 时，也是拥有法力值的职业，所以可以喝药水。
- 法力值是 `None` 时不能喝药水，返回 `None`。
- 名字、等级和生命值不变。

```gleam
drink_potion(Player(name: None, level: 3, health: 50, mana: Some(90)), 30)
// -> Some(Player(name: None, level: 3, health: 50, mana: Some(100)))

drink_potion(Player(name: None, level: 3, health: 50, mana: None), 30)
// -> None
```
