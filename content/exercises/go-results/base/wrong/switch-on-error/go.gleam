import gleam/result

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
  let outcome =
    game
    |> rule1
    |> result.map(rule2)
    |> result.try(rule3)
    |> result.try(rule4)
  let next = case outcome {
    Ok(updated) -> updated
    Error(message) -> Game(..game, error: message)
  }
  change_player(next)
}

fn change_player(game: Game) -> Game {
  let next = case game.player {
    White -> Black
    Black -> White
  }
  Game(..game, player: next)
}
