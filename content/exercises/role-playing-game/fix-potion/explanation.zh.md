bug 的原因是第一行的 `option.unwrap(player.mana, 0)`。过了这一行，“没有法力值的职业”（`None`）和“法力值耗尽的魔法师”（`Some(0)`）都变成了同一个 `0`，接下来的代码就给所有玩家都造出了 `Some(...)` 法力值。`Option` 承载的“没有”这一信息被默认值覆盖而丢失了。

修复后的代码先把 `player.mana` 分成 `Some` 和 `None`，只在 `Some` 时构造新玩家。

```gleam
case player.mana {
  Some(mana) -> Some(Player(..player, mana: Some(int.min(mana + amount, max_mana))))
  None -> None
}
```

同样的意思也可以写成 `option.map(player.mana, fn(mana) { Player(..player, mana: Some(...)) })`。`map` 会让 `None` 原样通过，所以“不能喝”会自动保留。

修复时常见的错误有两种。

- 改成在 `unwrap` 的结果为 `0` 时返回 `None`：这下 `Some(0)` 的魔法师就喝不了药水了。0 和“没有”依然混在一起。
- 在 `None` 时返回 `Some(player)`：调用方无法区分“喝了药水”和“没能喝”。

只有在确信“没有值时用这个值代替，结果同样正确”时才使用 `unwrap`。理论笔记“全函数与偏函数”（total-vs-partial-functions）中更详细地讲了为什么要用返回类型体现失败。
