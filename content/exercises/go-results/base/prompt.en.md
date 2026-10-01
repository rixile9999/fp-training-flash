In a game of Go, four rules are applied in turn every time a stone is played. The rules themselves are already implemented and given to you as functions; you write `apply_rules`, which applies them.

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

- Apply the rules in the order `rule1`, `rule2`, `rule3`, `rule4`; each rule receives the game returned by the previous rule.
- `rule2` (capturing stones) never fails but may change the game. The other three rules can fail with `Error(message)`.
- If every rule passes, take the game as changed by the rules, switch only `player` to the opponent (`Black` ↔ `White`), and return it.
- If any rule fails, do not apply the rules after it. Return **the `game` you originally received** with only its `error` field set to the failure message. Discard whatever the rules changed, and do not change the turn either.

```gleam
let game = Game(0, 0, White, "")
apply_rules(game, fn(g) { Ok(g) }, fn(g) { g }, fn(g) { Ok(g) }, fn(_) { Error("Ko rule violation") })
// -> Game(0, 0, White, "Ko rule violation")
```
