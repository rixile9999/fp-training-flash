바둑 규칙이 늘어나면서 규칙을 인자 네 개로 받는 대신 목록으로 받기로 했습니다. 이번에는 오류를 게임 안에 적지 않고 `Result`로 돌려줍니다.

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

`apply_rules(game: Game, rules: List(Rule)) -> Result(Game, String)`를 구현하세요.

- 규칙은 목록의 앞에서부터 차례로 적용한다. 각 규칙은 앞 규칙이 돌려준 게임을 받는다.
- 모든 규칙이 `Ok`이면 마지막 게임에서 `player`만 상대(`Black` ↔ `White`)로 바꿔 `Ok`로 반환한다. 규칙 목록이 비어 있어도 마찬가지다.
- 어떤 규칙이 `Error(메시지)`를 돌려주면 뒤 규칙은 적용하지 않고 그 `Error(메시지)`를 그대로 반환한다.

```gleam
let capture = fn(g: Game) { Ok(Game(..g, white_captured_stones: g.white_captured_stones + 1)) }
apply_rules(Game(0, 0, White), [capture, capture])
// -> Ok(Game(2, 0, Black))
apply_rules(Game(0, 0, White), [capture, fn(_) { Error("패 규칙 위반") }])
// -> Error("패 규칙 위반")
```
