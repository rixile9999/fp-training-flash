바둑 게임에서 돌을 한 번 둘 때마다 네 가지 규칙을 차례로 적용합니다. 규칙 자체는 이미 구현되어 함수로 주어지고, 여러분은 규칙을 적용하는 `apply_rules`를 작성합니다.

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

- 규칙은 `rule1`, `rule2`, `rule3`, `rule4` 순서로 적용하고, 각 규칙은 앞 규칙이 돌려준 게임을 받는다.
- `rule2`(돌 따내기)는 실패하지 않지만 게임을 바꿀 수 있다. 나머지 세 규칙은 `Error(메시지)`로 실패할 수 있다.
- 모든 규칙을 통과하면 규칙들이 바꾼 게임에서 `player`만 상대(`Black` ↔ `White`)로 바꿔 반환한다.
- 어느 규칙이든 실패하면 그 뒤 규칙은 적용하지 않는다. **처음 받은 `game`**에서 `error` 필드만 실패 메시지로 바꿔 반환한다. 규칙들이 바꾼 내용은 버리고, 차례도 바꾸지 않는다.

```gleam
let game = Game(0, 0, White, "")
apply_rules(game, fn(g) { Ok(g) }, fn(g) { g }, fn(g) { Ok(g) }, fn(_) { Error("패 규칙 위반") })
// -> Game(0, 0, White, "패 규칙 위반")
```
