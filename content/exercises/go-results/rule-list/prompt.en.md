As the number of Go rules grew, it was decided to take the rules as a list instead of four arguments. This time, instead of writing the error into the game, you return it as a `Result`.

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

Implement `apply_rules(game: Game, rules: List(Rule)) -> Result(Game, String)`.

- Apply the rules in turn, starting from the front of the list. Each rule receives the game returned by the previous rule.
- If every rule returns `Ok`, switch only `player` to the opponent (`Black` ↔ `White`) in the last game and return it as `Ok`. The same holds when the rule list is empty.
- If a rule returns `Error(message)`, do not apply the rules after it, and return that `Error(message)` unchanged.

```gleam
let capture = fn(g: Game) { Ok(Game(..g, white_captured_stones: g.white_captured_stones + 1)) }
apply_rules(Game(0, 0, White), [capture, capture])
// -> Ok(Game(2, 0, Black))
apply_rules(Game(0, 0, White), [capture, fn(_) { Error("Ko rule violation") }])
// -> Error("Ko rule violation")
```
