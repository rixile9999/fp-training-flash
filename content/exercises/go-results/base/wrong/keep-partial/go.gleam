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
) -> Game {
  case rule1(game) {
    Error(message) -> Game(..game, error: message)
    Ok(first) -> {
      let captured = rule2(first)
      case rule3(captured) {
        Error(message) -> Game(..captured, error: message)
        Ok(third) ->
          case rule4(third) {
            Error(message) -> Game(..third, error: message)
            Ok(last) -> change_player(last)
          }
      }
    }
  }
}

fn change_player(game: Game) -> Game {
  let next = case game.player {
    White -> Black
    Black -> White
  }
  Game(..game, player: next)
}
