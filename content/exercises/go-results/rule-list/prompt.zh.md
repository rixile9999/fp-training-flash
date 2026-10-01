随着围棋规则越来越多，决定不再用四个参数接收规则，而是改用列表。这一次不把错误写进游戏里，而是以 `Result` 返回。

```gleam
pub type Player {
  Black
  White
}

pub type Game {
  Game(white_captured_stones: Int, black_captured_stones: Int, player: Player)
}

pub type Rule =
  fn(Game) -> Result(Game, String)
```

请实现 `apply_rules(game: Game, rules: List(Rule)) -> Result(Game, String)`。

- 从列表开头起依次应用规则。每条规则接收前一条规则返回的游戏。
- 所有规则都返回 `Ok` 时，在最后的游戏中只把 `player` 换成对手（`Black` ↔ `White`），以 `Ok` 返回。规则列表为空时也一样。
- 某条规则返回 `Error(消息)` 时，不再应用其后的规则，原样返回这个 `Error(消息)`。

```gleam
let capture = fn(g: Game) { Ok(Game(..g, white_captured_stones: g.white_captured_stones + 1)) }
apply_rules(Game(0, 0, White), [capture, capture])
// -> Ok(Game(2, 0, Black))
apply_rules(Game(0, 0, White), [capture, fn(_) { Error("违反劫争规则") }])
// -> Error("违反劫争规则")
```
