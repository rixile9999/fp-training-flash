在围棋游戏中，每落一次子都要依次应用四条规则。规则本身已经实现好并以函数的形式给出，你要编写应用这些规则的 `apply_rules`。

```gleam
pub type Player {
  Black
  White
}

pub type Game {
  Game(
    white_captured_stones: Int,
    black_captured_stones: Int,
    player: Player,
    error: String,
  )
}

pub fn apply_rules(
  game: Game,
  rule1: fn(Game) -> Result(Game, String),
  rule2: fn(Game) -> Game,
  rule3: fn(Game) -> Result(Game, String),
  rule4: fn(Game) -> Result(Game, String),
) -> Game
```

- 按 `rule1`、`rule2`、`rule3`、`rule4` 的顺序应用规则，每条规则接收前一条规则返回的游戏。
- `rule2`（提子）不会失败，但可能修改游戏。其余三条规则可能以 `Error(消息)` 失败。
- 所有规则都通过时，在规则修改后的游戏中只把 `player` 换成对手（`Black` ↔ `White`）并返回。
- 任何一条规则失败时，不再应用其后的规则。返回**最初收到的 `game`**，只把其中的 `error` 字段改为失败消息。丢弃规则所做的修改，轮次也不交换。

```gleam
let game = Game(0, 0, White, "")
apply_rules(game, fn(g) { Ok(g) }, fn(g) { g }, fn(g) { Ok(g) }, fn(_) { Error("违反劫争规则") })
// -> Game(0, 0, White, "违反劫争规则")
```
