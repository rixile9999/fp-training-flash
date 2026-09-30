import gleam/list
import gleam/result

pub type Player {
  Black
  White
}

pub type Game {
  Game(white_captured_stones: Int, black_captured_stones: Int, player: Player)
}

pub type Rule =
  fn(Game) -> Result(Game, String)

pub fn apply_rules(game: Game, rules: List(Rule)) -> Result(Game, String) {
  use results <- result.try(list.try_map(rules, fn(rule) { rule(game) }))
  let last = case list.last(results) {
    Ok(updated) -> updated
    Error(Nil) -> game
  }
  Ok(change_player(last))
}

fn change_player(game: Game) -> Game {
  let next = case game.player {
    White -> Black
    Black -> White
  }
  Game(..game, player: next)
}
